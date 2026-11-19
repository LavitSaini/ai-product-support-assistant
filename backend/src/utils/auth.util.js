import jwt from "jsonwebtoken";

export const generateToken = async (userId) => {
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "5d" });
    return token
}

export const setCookies = async (token, res) => {
    res.cookie("token", token, {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "strict",
        maxAge: 5 * 24 * 60 * 60 * 1000,
    });
}