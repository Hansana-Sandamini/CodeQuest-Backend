import { Router } from "express"
import { getLeaderboard, getMyRank } from "../controllers/leaderboard.controller"
import { authenticate } from "../middlewares/auth.middleware"

const router = Router()

router.get("/", getLeaderboard)
router.get("/me", authenticate, getMyRank)

export default router
