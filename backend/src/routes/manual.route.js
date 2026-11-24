import { Router } from "express";
import {
  generateProductManualUploadSignature,
  getProductManuals,
  getSingleManual,
  saveProductManualMetadata,
} from "../controllers/manual.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get(
  "/:productId/upload-signature",
  checkAuth,
  generateProductManualUploadSignature,
);
router.post("/:productId", checkAuth, saveProductManualMetadata);
router.get("/product/:productId", getProductManuals);
router.get("/:id", getSingleManual);

export default router;
