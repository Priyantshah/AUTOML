import express from "express";
import { trainModel } from "../controllers/trinController.js";

const router = express.Router();

router.post("/", trainModel);

export default router;
