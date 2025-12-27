import { Router } from "express"
import { getDailyQuestion } from "../controllers/daily-question.controller"
import { authenticate } from "../middlewares/auth.middleware"

const router = Router()

router.get("/", authenticate, getDailyQuestion)

export default router
