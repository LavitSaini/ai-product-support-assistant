import User from "../models/User.model.js";
import bcrypt from "bcrypt";
import { generateToken, setCookies } from "../utils/auth.util.js";

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required!" });
    }

    if (name.length > 25) {
      return res.status(400).json({
        success: false,
        message: "Name can contains only 25 characters!",
      });
    }

    if (!email.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required!" });
    }

    if (!password.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Password is required!" });
    }

    if (password.trim().length < 5) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password contains minimum 5 characters!",
        });
    }

    const isUserAlreadyExists = await User.findOne({ email });

    if (isUserAlreadyExists) {
      return res
        .status(400)
        .json({ success: false, message: "Email already taken!" });
    }

    const user = await User.create({ name, email, password });

    const token = await generateToken(user._id);
    setCookies(token, res);

    return res.status(200).json({
      success: true,
      user: { ...user._doc, password: undefined },
      message: "Register Successful!",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error!" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required!" });
    }

    if (!password.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Password is required!" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Credentials!" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Credentials!" });
    }

    const token = await generateToken(user._id);
    console.log(token);
    setCookies(token, res);

    return res.status(200).json({
      success: true,
      user: { ...user._doc, password: undefined },
      message: "Login Successful!",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error!" });
  }
};

export const logout = async (req, res) => {
  try {
    const { token } = req.cookies;

    if (!token) {
      return res
        .status(200)
        .json({ success: false, message: "You already logged out!" });
    }

    res.clearCookie("token");
    return res
      .status(200)
      .json({ success: true, message: "Logged Out Successfull!" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error!" });
  }
};
