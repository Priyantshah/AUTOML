import express from "express";
import { predict } from "../controllers/predictController.js";

const router = express.Router();

import upload from "../middlewares/uploadMiddleware.js";

router.post("/", upload.single("file"), predict);

export default router;
