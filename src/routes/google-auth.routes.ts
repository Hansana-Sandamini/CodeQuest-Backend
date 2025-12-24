import { Router } from 'express'
import passport from '../config/passport'
import { signAccessToken, signRefreshToken } from '../utils/tokens'

const router = Router()

// Start Google login
router.get(
    '/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
    })
)

// Google callback
router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/api/v1/auth/google/failure' }),
    (req, res) => {
        const user = req.user as any

        if (!user) {
            const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173'
            return res.redirect(`${frontendURL}/login?error=google_noaccount`)
        }

        const accessToken = signAccessToken(user)
        const refreshToken = signRefreshToken(user)
        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173'

        res.redirect(`${frontendURL}/auth/google/callback?access=${accessToken}&refresh=${refreshToken}`)
    }
)

router.get('/google/failure', (req, res) => {
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173'

    // Redirect to login with error query param
    res.redirect(`${frontendURL}/login?error=google_failed`)
})

export default router
