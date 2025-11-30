import { runPython } from "../utils/pythonBridge.js";

export const getPreview = async (req, res) => {
    try {
        const { fileUrl } = req.body; // Expecting fileUrl in body, or we could use a fileId if we had a DB

        if (!fileUrl) {
            return res.status(400).json({ error: "fileUrl is required" });
        }

        // Reuse get_metadata.py as it returns preview and columns
        const metadata = await runPython([
            "./python/get_metadata.py",
            "--file",
            fileUrl
        ]);

        if (metadata.error) {
            return res.status(500).json({ error: metadata.error });
        }

        res.json({ status: "success", data: metadata });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
