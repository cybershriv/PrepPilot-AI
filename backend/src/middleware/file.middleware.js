const multer = require("multer")

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 3 * 1024 * 1024 // 3MB
    }

})

function uploadResume(req, res, next) {
    upload.single("resume")(req, res, (error) => {
        if (!error) {
            return next()
        }

        if (error instanceof multer.MulterError) {
            const isFileTooLarge = error.code === "LIMIT_FILE_SIZE"
            return res.status(isFileTooLarge ? 413 : 400).json({
                message: isFileTooLarge
                    ? "Resume must be 3 MB or smaller."
                    : "Resume upload failed."
            })
        }

        next(error)
    })
}

module.exports = uploadResume