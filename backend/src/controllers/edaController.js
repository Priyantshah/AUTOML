import { runPython } from "../utils/pythonBridge.js";

export const performEDA = async (req, res) => {
    try {
        const { fileUrl, targetColumn } = req.body;

        if (!fileUrl) {
            return res.status(400).json({ error: "fileUrl is required" });
        }

        const args = ["./python/eda.py", "--file", fileUrl];
        if (targetColumn) {
            args.push("--target", targetColumn);
        }

        const result = await runPython(args);

        if (result.error) {
            return res.status(500).json({ error: result.error });
        }

        res.json({ status: "success", data: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
