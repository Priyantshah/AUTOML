import { runPython } from "../utils/pythonBridge.js";
import fs from "fs";
import path from "path";
import os from "os";

export const predict = async (req, res) => {
    try {
        const { modelUrl, inputData } = req.body;
        const file = req.file;

        console.log("Predict Request Received:");
        console.log("Model URL:", modelUrl);
        console.log("File:", file ? "Present" : "None");
        console.log("Input Data:", inputData ? "Present" : "None");

        if (!modelUrl) {
            return res.status(400).json({ error: "modelUrl is required" });
        }

        if (!inputData && !file) {
            return res.status(400).json({ error: "Either inputData or file is required" });
        }

        let pythonArgs = ["./python/predict.py", "--model", modelUrl];
        let tempInputPath = null;

        if (file) {
            // Write buffer to temp file
            const tempDir = os.tmpdir();
            tempInputPath = path.join(tempDir, `input_${Date.now()}.csv`);
            await fs.promises.writeFile(tempInputPath, file.buffer);

            pythonArgs.push("--input_file", tempInputPath);
        } else {
            pythonArgs.push("--input", JSON.stringify(inputData));
        }

        const result = await runPython(pythonArgs);

        if (result.error) {
            console.error("Python Script Error:", result.error);
            if (tempInputPath) await fs.promises.unlink(tempInputPath).catch(() => { });
            return res.status(500).json({ error: result.error });
        }

        if (file && result.csv_path) {
            // If file upload, we expect a CSV path back
            // Read the CSV file and send it
            // We can send it as a download
            // Or return the content in JSON. 
            // Let's return the content in JSON for simplicity in frontend handling for now, 
            // or better, send the file.

            // Actually, sending file is better for large datasets.
            // But runPython parses JSON output from stdout.
            // We can read the file content and send it.

            // To allow frontend to download, we can send the file content.
            // But we also want to send the preview.
            // So let's return JSON with preview and a "downloadUrl" if we stored it, 
            // OR just return the CSV content as a string in JSON (limit size?)
            // OR send the file stream.

            // If we send file stream, we can't send preview JSON easily in same response.
            // Let's stick to JSON response with "csvContent" (base64 or string) or just "preview" 
            // and let frontend convert preview to CSV? No, backend did the prediction.

            // Let's return the preview and the full CSV content as a string (if not too huge).
            // For MVP, this is fine.

            const csvContent = await fs.promises.readFile(result.csv_path, 'utf-8');

            // Cleanup
            await fs.promises.unlink(tempInputPath).catch(() => { });
            await fs.promises.unlink(result.csv_path).catch(() => { });

            res.json({
                status: "success",
                data: {
                    preview: result.preview,
                    csvContent: csvContent,
                    task_type: result.task_type
                }
            });

        } else {
            // Normal JSON prediction
            res.json({ status: "success", data: result });
        }

    } catch (err) {
        console.error("Prediction error:", err);
        res.status(500).json({ error: err.message });
    }
};
