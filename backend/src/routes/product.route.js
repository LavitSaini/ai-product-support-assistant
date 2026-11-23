import { Router } from "express";
import {
  getAllActiveProducts,
  getSingleProduct,
} from "../controllers/product.controller.js";

const router = Router();

router.get("/", getAllActiveProducts);
router.get("/:id", getSingleProduct);

export default router;
