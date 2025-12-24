import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import dotenv from 'dotenv'
import { User } from '../models/user.model'
import { signAccessToken, signRefreshToken } from '../utils/tokens'

dotenv.config()

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const CALLBACK_URL = process.env.NODE_ENV === 'production'
    ? 'https://your-api-domain.com/api/v1/auth/google/callback'
    : 'http://localhost:5000/api/v1/auth/google/callback'

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env')
}

passport.use(
    new GoogleStrategy(
        {
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL: CALLBACK_URL,
            scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Find user by Google ID
                let user = await User.findOne({ googleId: profile.id })

                if (!user) {
                    // Check if email exists
                    const existingByEmail = await User.findOne({
                        email: profile.emails?.[0]?.value.toLowerCase(),
                    })

                    if (existingByEmail) {
                        // Link Google ID if desired
                        existingByEmail.googleId = profile.id
                        await existingByEmail.save()
                        return done(null, existingByEmail)
                    }

                    // User does not exist → reject login
                    return done(null, false, { message: 'No account associated with this Google account.' })
                }

                // User exists → log in
                return done(null, user)
            } catch (err) {
                return done(err)
            }
        }
    )
)

export default passport
