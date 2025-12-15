import { Router } from "express"
import { authenticate, requireRole } from "../middlewares/auth.middleware"
import { Role } from "../models/user.model"
import { upload } from "../middlewares/upload.middleware"
import { 
    forgotPassword, 
    getMyProfile, 
    login, 
    refreshToken, 
    registerUser, 
    resetPasswordWithOtp 
} from "../controllers/auth.controller"

const router = Router()

router.post("/register", upload.single("profilePicture"), registerUser)
router.post("/login", login)
router.post("/refresh", refreshToken)
router.get("/profile", authenticate, requireRole([Role.ADMIN, Role.USER]), getMyProfile)
router.post("/forgot-password", forgotPassword)              
router.post("/reset-password-otp", resetPasswordWithOtp)     

export default router
