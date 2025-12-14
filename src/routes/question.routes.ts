import { Router } from "express"
import { authenticate, requireRole } from "../middlewares/auth.middleware"
import { Role } from "../models/user.model"
import {
    createQuestion,
    getQuestions,
    getQuestionsByLanguage,
    updateQuestion,
    deleteQuestion,
    getQuestionFull,
    getQuestionById
} from "../controllers/question.controller"

const router = Router()

router.post("/", authenticate, requireRole([Role.ADMIN]), createQuestion)
router.get("/", getQuestions)
router.get("/language/:languageId", getQuestionsByLanguage)
router.put("/:id", authenticate, requireRole([Role.ADMIN]), updateQuestion)
router.delete("/:id", authenticate, requireRole([Role.ADMIN]), deleteQuestion)
router.get("/:id/full", authenticate, requireRole([Role.ADMIN]), getQuestionFull)
router.get("/:id", getQuestionById) 

export default router
