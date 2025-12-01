import { Router } from "express"
import { authenticate, requireRole } from "../middlewares/auth.middleware"
import { Role } from "../models/user.model"
import {
    createLanguage,
    getLanguages,
    getLanguageById,
    updateLanguage,
    deleteLanguage
} from "../controllers/language.controller"

const router = Router()

router.post("/", authenticate, requireRole([Role.ADMIN]), createLanguage)
router.get("/", getLanguages)
router.get("/:id", getLanguageById)
router.put("/:id", authenticate, requireRole([Role.ADMIN]), updateLanguage)
router.delete("/:id", authenticate, requireRole([Role.ADMIN]), deleteLanguage)

export default router
