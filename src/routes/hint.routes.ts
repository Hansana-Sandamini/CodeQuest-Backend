import { Router } from "express"
import { authenticate } from "../middlewares/auth.middleware"
import { getQuestionHint } from "../controllers/hint.controller"

const router = Router()

router.get("/question/:id", authenticate, getQuestionHint)

export default router
