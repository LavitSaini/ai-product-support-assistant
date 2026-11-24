import cloudinary from "../config/cloudinary.js";
import dotenv from "dotenv";
dotenv.config();

export const generateCloudinaryUploadSignature = (
  folderName,
  timestamp,
  publicId,
) => {
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder: folderName,
      public_id: publicId,
    },
    process.env.CLOUDINARY_API_SECRET,
  );

  return signature;
};
