import supabase from "../db/index.js";
import { runPython } from "../utils/pythonBridge.js";

export const handleUpload = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const file = req.file;
        const fileName = `${Date.now()}_${file.originalname}`;
        const bucketName = "csv-uploads";

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            throw error;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        const publicUrl = publicUrlData.publicUrl;

        // Get Metadata using Python
        let metadata = {};
        try {
            metadata = await runPython([
                "./python/get_metadata.py",
                "--file",
                publicUrl
            ]);
        } catch (pyError) {
            console.error("Python metadata extraction failed:", pyError);
            metadata = { error: "Failed to extract metadata" };
        }

        return res.json({
            status: "success",
            message: "File uploaded successfully",
            data: {
                path: data.path,
                fileUrl: publicUrl,
                originalName: file.originalname,
                metadata: metadata
            }
        });

    } catch (err) {
        console.error("Upload error:", err);
        return res.status(500).json({ error: err.message });
    }
};
