import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";


import authRouter from "./routes/auth.route.js";
import productRouter from "./routes/product.route.js";
import manualRouter from "./routes/manual.route.js";

dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI Product Support API is running!",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/manuals", manualRouter);

app.listen(PORT, () => {
  console.log("Server is listening on PORT " + PORT);
  connectDB(MONGODB_URI);
});
