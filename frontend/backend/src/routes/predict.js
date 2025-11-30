import express from "express";
import { predict } from "../controllers/predictController.js";

const router = express.Router();

import upload from "../middlewares/fileUploadMiddleware.js";

router.post("/", upload.single("file"), predict);

export default router;
