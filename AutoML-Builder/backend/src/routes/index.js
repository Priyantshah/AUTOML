import express from "express";
import uploadRoutes from "./upload.js";
import predictRoutes from "./predict.js";
import trainRoutes from "./train.js";
import previewRoutes from "./preview.js";
import edaRoutes from "./eda.js";
import imputeRoutes from "./impute.js";

const router = express.Router();

router.use("/upload", uploadRoutes);
router.use("/predict", predictRoutes);
router.use("/train", trainRoutes);
router.use("/preview", previewRoutes);
router.use("/eda", edaRoutes);
router.use("/impute", imputeRoutes);

export default router;
