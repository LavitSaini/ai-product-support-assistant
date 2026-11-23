import { Router } from "express";
import { getAllActiveProducts, getSingleProduct } from "../controllers/product.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", checkAuth, getAllActiveProducts);
router.get("/:id", getSingleProduct);

export default router;
