import mongoose from "mongoose"

export const connectDB = async (): Promise<void> => {
    const MONGO_URI = process.env.MONGO_URI as string

    if (!MONGO_URI) {
        throw new Error("MONGO_URI not found in .env file")
    }

    try {
        const connection = await mongoose.connect(MONGO_URI)
        console.log(`MongoDB Connected: ${connection.connection.host}`)
    } catch (error) {
        console.error("Database connection failed:", error)
        process.exit(1)
    }
}
