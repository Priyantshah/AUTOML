import express from "express";
import { performEDA } from "../controllers/edaController.js";

const router = express.Router();

router.post("/", performEDA);

export default router;
