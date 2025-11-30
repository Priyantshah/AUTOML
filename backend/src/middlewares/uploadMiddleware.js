import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Allow any file ending in .csv regardless of mimetype
    if (file.originalname.toLowerCase().endsWith(".csv")) {
        cb(null, true);
    } else {
        cb(new Error("Only CSV allowed"), false);
    }
};

const upload = multer({ storage, fileFilter });

export default upload;
