import { runPython } from "../utils/pythonBridge.js";

export const trainModel = async (req, res) => {
    try {
        const { target, filePath } = req.body;

        if (!target || !filePath)
            return res.status(400).json({ error: "target & filePath are required" });

        const result = await runPython([
            "./python/train.py",
            "--file",
            filePath,
            "--target",
            target
        ]);

        res.json({ status: "success", result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
