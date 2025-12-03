import { Router } from "express"
import { authenticate, requireRole } from "../middlewares/auth.middleware"
import { Role } from "../models/user.model"
import multer from "multer"
import {
    getAllUsers,
    getUserById,
    getUserProfile,
    updateMyProfile,
    updateProfilePicture,
    changePassword,
    updateUserRole,
    deleteUser
} from "../controllers/user.controller"

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
})

// PUBLIC ROUTES
router.get("/profile/:username", getUserProfile) 

// AUTHENTICATED USER
router.put("/me", authenticate, updateMyProfile)
router.put("/me/password", authenticate, changePassword)
router.put(
    "/me/profile-picture",
    authenticate,
    upload.single("image"),
    updateProfilePicture
)

// ADMIN ONLY
router.get("/", authenticate, requireRole([Role.ADMIN]), getAllUsers)
router.get("/:id", authenticate, requireRole([Role.ADMIN]), getUserById)
router.put("/:id/roles", authenticate, requireRole([Role.ADMIN]), updateUserRole)
router.delete("/:id", authenticate, requireRole([Role.ADMIN]), deleteUser)

export default router
