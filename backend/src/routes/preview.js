import express from "express";
import { getPreview } from "../controllers/previewController.js";

const router = express.Router();

router.post("/", getPreview);

export default router;
