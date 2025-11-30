import express from "express";
import { trainModels } from "../controllers/trainController.js";

const router = express.Router();

router.post("/", trainModels);

export default router;
