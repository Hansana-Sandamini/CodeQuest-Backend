import { Router } from "express"
import { authenticate, requireRole } from "../middlewares/auth.middleware"
import { Role } from "../models/user.model"
import { getMyProfile, login, refreshToken, registerUser } from "../controllers/auth.controller"
import { upload } from "../middlewares/upload.middleware"

const router = Router()

router.post("/register", upload.single("profilePicture"), registerUser)
router.post("/login", login)
router.post("/refresh", refreshToken)
router.get("/profile", authenticate, requireRole([Role.ADMIN, Role.USER]), getMyProfile)

export default router
