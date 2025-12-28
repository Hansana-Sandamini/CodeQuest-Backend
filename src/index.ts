import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { connectDB } from "./config/db"
import "./models/question.model"
import "./models/language.model"
import authRouter from "./routes/auth.routes"
import languageRouter from "./routes/language.routes"
import questionRouter from "./routes/question.routes"
import hintRouter from "./routes/hint.routes"
import progressRouter from "./routes/progress.routes"
import leaderboardRouter from "./routes/leaderboard.routes"
import userRouter from "./routes/user.routes"
import googleAuthRouter from './routes/google-auth.routes'
import dailyQuestionRouter from "./routes/daily-question.routes"

dotenv.config()

const PORT = process.env.PORT || 5000
const app = express()

app.use(express.json())

app.use(
    cors({ 
        origin: ["http://localhost:5173", "https://code-quest-pied.vercel.app"],
        methods: ["GET", "POST", "PUT", "DELETE"]
    })
)

app.use("/api/v1/auth", authRouter)
app.use('/api/v1/auth', googleAuthRouter)
app.use("/api/v1/languages", languageRouter)
app.use("/api/v1/questions", questionRouter)
app.use("/api/v1/hints", hintRouter)
app.use("/api/v1/progress", progressRouter)
app.use("/api/v1/leaderboard", leaderboardRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/daily-question", dailyQuestionRouter)

const startServer = async () => {
    try {
        await connectDB()
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
        })
    } catch (error) {
        console.error("Failed to start server:", error)
        process.exit(1)
    }
}

startServer()
