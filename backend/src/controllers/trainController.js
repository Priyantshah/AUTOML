import { runPython } from "../utils/pythonBridge.js";
import supabase from "../db/index.js";
import fs from "fs";
import path from "path";

export const trainModels = async (req, res) => {
    try {
        const { fileUrl, targetColumn } = req.body;

        if (!fileUrl || !targetColumn) {
            return res.status(400).json({ error: "fileUrl and targetColumn are required" });
        }

        // 1. Run Training Script
        const result = await runPython([
            "./python/train.py",
            "--file",
            fileUrl,
            "--target",
            targetColumn
        ], (data) => {
            // Log progress to server console instead of streaming to client
            console.log(`Training Progress: ${data.progress}%`);
        });

        if (result.error) {
            return res.status(500).json({ status: "error", error: result.error });
        }

        // 2. Upload Best Model to Supabase
        let modelUrl = "";
        if (result.model_path && fs.existsSync(result.model_path)) {
            try {
                const modelFileContent = fs.readFileSync(result.model_path);
                const modelFileName = path.basename(result.model_path);
                const bucketName = "models";

                // Ensure bucket exists
                const { data: buckets, error: listError } = await supabase.storage.listBuckets();
                if (!listError) {
                    const bucketExists = buckets.find(b => b.name === bucketName);
                    if (!bucketExists) {
                        console.log(`Bucket '${bucketName}' not found. Creating...`);
                        const { error: createError } = await supabase.storage.createBucket(bucketName, {
                            public: true
                        });
                        if (createError) {
                            console.error("Failed to create bucket:", createError);
                        }
                    }
                }

                const { data, error } = await supabase.storage
                    .from(bucketName)
                    .upload(modelFileName, modelFileContent, {
                        contentType: 'application/octet-stream',
                        upsert: true
                    });

                if (error) {
                    console.error("Model upload failed:", error);
                    // Do not delete local file if upload fails, so we can use it locally/temporarily
                } else {
                    const { data: publicUrlData } = supabase.storage
                        .from(bucketName)
                        .getPublicUrl(modelFileName);

                    modelUrl = publicUrlData.publicUrl;

                    // Cleanup local file only if upload succeeded
                    try {
                        if (fs.existsSync(result.model_path)) {
                            fs.unlinkSync(result.model_path);
                        }
                    } catch (cleanupErr) {
                        console.error("Failed to cleanup model file:", cleanupErr);
                    }
                }

            } catch (uploadErr) {
                console.error("Model upload error:", uploadErr);
                // Do not delete local file if error
            }
        }

        // Send final result as standard JSON
        res.json({
            status: "success",
            data: {
                ...result,
                model_url: modelUrl
            }
        });

    } catch (err) {
        console.error("Train Controller Error:", err);
        res.status(500).json({ status: "error", error: err.message });
    }
};
