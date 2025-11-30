import { runPython } from "../utils/pythonBridge.js";
import supabase from "../db/index.js";
import fs from "fs";
import path from "path";
import os from "os";

export const imputeData = async (req, res) => {
    try {
        const { fileUrl, column, strategy = 'auto' } = req.body;

        if (!fileUrl || !column) {
            return res.status(400).json({ error: "fileUrl and column are required" });
        }

        // 1. Download the file from Supabase to a temp file to ensure we have the latest version
        // (Avoiding potential caching issues with pd.read_csv(url))
        // Handle potential query params in URL
        const cleanUrl = fileUrl.split('?')[0];
        const urlParts = cleanUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const bucketName = "csv-uploads";

        const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucketName)
            .download(fileName);

        if (downloadError) {
            throw new Error("Failed to download file from storage: " + downloadError.message);
        }

        const tempDir = os.tmpdir();
        const tempInputPath = path.join(tempDir, `input_${Date.now()}_${fileName}`);
        const buffer = Buffer.from(await fileData.arrayBuffer());
        fs.writeFileSync(tempInputPath, buffer);

        // 2. Run Imputation on the local temp file
        const result = await runPython([
            "./python/impute.py",
            "--file",
            tempInputPath,
            "--column",
            column,
            "--strategy",
            strategy
        ]);

        // Cleanup input temp file
        try {
            fs.unlinkSync(tempInputPath);
        } catch (e) { console.error("Failed to cleanup input temp file", e); }

        if (result.error) {
            return res.status(500).json({ error: result.error });
        }

        // 3. Upload the result back to Supabase
        if (result.temp_path && fs.existsSync(result.temp_path)) {
            try {
                const fileContent = fs.readFileSync(result.temp_path);

                const { error: uploadError } = await supabase.storage
                    .from(bucketName)
                    .upload(fileName, fileContent, {
                        contentType: 'text/csv',
                        upsert: true
                    });

                if (uploadError) {
                    throw new Error("Failed to update remote file: " + uploadError.message);
                }

            } catch (uploadErr) {
                return res.status(500).json({ error: uploadErr.message });
            } finally {
                // Cleanup output temp file
                try {
                    fs.unlinkSync(result.temp_path);
                } catch (cleanupErr) {
                    console.error("Failed to cleanup output temp file:", cleanupErr);
                }
            }
        }

        res.json({ status: "success", data: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
