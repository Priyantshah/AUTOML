import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Allow any file ending in .csv regardless of mimetype
    if (file.originalname.toLowerCase().endsWith(".csv")) {
        cb(null, true);
    } else {
        const error = new Error("Only CSV allowed");
        error.status = 400;
        cb(error, false);
    }
};

const upload = multer({ storage, fileFilter });

export default upload;
