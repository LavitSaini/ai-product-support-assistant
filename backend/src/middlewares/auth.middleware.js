import User from "../models/User.model.js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

export const checkAuth = async (req, res, next) => {
  try {
    const { token } = req.cookies;

    if (!token) {
      return res.status(401).json({
        message: "Session Expired!",
      });
    }

    try {
      const { id } = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(id).select("-password");

      if (!user) {
        return res.status(400).json({
          message: "Unauthorized - User not found",
        });
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Unauthorized - Token expired",
        });
      }
      return res.status(401).json({
        message: "Unauthorized - Invalid token",
      });
    }
  } catch (error) {
    console.error("Error in checkAuth middleware:", error.stack);
    return res.status(401).json({
      message: "Unauthorized - An error occurred",
    });
  }
};
