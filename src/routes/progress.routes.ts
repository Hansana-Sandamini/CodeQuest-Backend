import { Router } from "express"
import { authenticate } from "../middlewares/auth.middleware"
import { submitAnswer, getUserProgress } from "../controllers/progress.controller"

const router = Router()

router.post("/submit/:id", authenticate, submitAnswer)   // Submit answer for question ID
router.get("/", authenticate, getUserProgress)   // Get all progress for user

export default router
