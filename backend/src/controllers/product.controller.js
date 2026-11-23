import mongoose from "mongoose";
import Product from "../models/Product.model.js";

export const getAllActiveProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ brand: 1, name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch products!",
    });
  }
};

export const getSingleProduct = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Product not found!" });
  }

  try {
    const product = await Product.findOne({ _id: id, isActive: true });
    if (!product) {
      return res
        .status(400)
        .json({ success: false, message: "Product not found!" });
    }
    return res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch product!",
    });
  }
};
