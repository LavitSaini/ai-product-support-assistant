import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Product from "../models/Product.model.js";
import { generateCloudinaryUploadSignature } from "../utils/cloudinary.util.js";
import Manual from "../models/Manual.model.js";
import cloudinary from "../config/cloudinary.js";
import { enqueueManualProcessing } from "../jobs/manual.queue.js";

export const generateProductManualUploadSignature = async (req, res) => {
  try {
    const { productId } = req.params;

    // 1. Validate productId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Product not found!",
      });
    }

    // 2. Check only admins can create signature
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can generate signature!",
      });
    }

    // 3. Check whether the product exists
    const product = await Product.findOne({
      _id: productId,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    // Generate upload parameters
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "ai-product-support/manuals";
    const publicId = `manual-${randomUUID()}`;

    const signature = generateCloudinaryUploadSignature(
      folder,
      timestamp,
      publicId,
    );

    return res.status(200).json({
      success: true,
      message: "Upload signature generated successfully.",
      upload: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        timestamp,
        folder,
        publicId,
        signature,
        resourceType: "raw",
      },
    });
  } catch (error) {
    console.error("Generate manual upload signature error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate upload signature.",
    });
  }
};

export const saveProductManualMetadata = async (req, res) => {
  try {
    const { productId } = req.params;
    const { title, public_id, secure_url, version, language } = req.body;

    // 1. Validate product ID
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    // 2. Validate required request fields
    if (
      typeof title !== "string" ||
      typeof public_id !== "string" ||
      typeof secure_url !== "string" ||
      !title.trim() ||
      !public_id.trim() ||
      !secure_url.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid title, public_id and secure_url are required.",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can save manual metadata.",
      });
    }

    // 4. Verify product exists
    const product = await Product.findOne({
      _id: productId,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    // 5. Check if this manual is already registered
    const existingManual = await Manual.findOne({
      cloudinaryPublicId: public_id,
    });

    if (existingManual) {
      return res.status(409).json({
        success: false,
        message: "This manual is already registered.",
      });
    }

    // 6. Verify uploaded asset directly with Cloudinary
    const asset = await cloudinary.api.resource(public_id, {
      resource_type: "raw",
      type: "upload",
    });

    // 7. Validate Cloudinary asset
    if (asset.resource_type !== "raw" || asset.type !== "upload") {
      return res.status(400).json({
        success: false,
        message: "Uploaded asset is not a valid PDF manual.",
      });
    }

    // 8. Verify URL matches the actual Cloudinary asset
    if (asset.secure_url !== secure_url) {
      return res.status(400).json({
        success: false,
        message: "Provided secure_url does not match Cloudinary asset.",
      });
    }

    // 9. Verify asset is stored in the expected folder
    if (
      asset.public_id !== public_id ||
      !public_id.startsWith("ai-product-support/manuals/manual-") ||
      !asset.asset_folder?.startsWith("ai-product-support/manuals")
    ) {
      return res.status(400).json({
        success: false,
        message: "Uploaded asset does not belong to the manual upload folder.",
      });
    }

    const manual = await Manual.create({
      productId: product._id,
      title: title.trim(),
      fileName: asset.public_id.split("/").pop(),
      fileUrl: asset.secure_url,
      cloudinaryPublicId: asset.public_id,
      fileSize: asset.bytes,
      mimeType: "application/pdf",
      format: "pdf",
      version: version || "1.0",
      language: language || "en",
      status: "uploaded",
      uploadedBy: req.user._id,
    });

    let job = null;

    try {
      job = await enqueueManualProcessing(manual._id);
    } catch (queueError) {
      console.error(
        "Failed to enqueue manual processing job:",
        queueError.message,
      );
    }

    return res.status(201).json({
      success: true,
      message: job
        ? "Manual saved and processing job queued."
        : "Manual saved, but processing could not be queued. Please retry.",
      data: {
        manual,
        jobId: job?.id || null,
        processingStatus: job ? "queued" : "queue_failed",
      },
    });
  } catch (error) {
    // Cloudinary returns an error if asset doesn't exist
    if (error?.error?.http_code === 404) {
      return res.status(404).json({
        success: false,
        message: "Uploaded asset not found on Cloudinary.",
      });
    }

    console.error("Save product manual metadata error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save product manual metadata.",
    });
  }
};

export const getProductManuals = async (req, res) => {};

export const getSingleManual = async (req, res) => {};
