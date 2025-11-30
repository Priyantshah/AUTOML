import express from "express";
import { imputeData } from "../controllers/imputeController.js";

const router = express.Router();

router.post("/", imputeData);

export default router;
