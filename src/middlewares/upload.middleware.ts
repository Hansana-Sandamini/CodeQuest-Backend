import multer from "multer"

// store file in memory
const storage = multer.memoryStorage()

export const upload = multer({ storage })
