import { Request, Response } from "express"
import { AuthRequest } from "../middlewares/auth.middleware"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import bcrypt from "bcryptjs"
import { signAccessToken, signRefreshToken } from "../utils/tokens"
import { Role, User } from "../models/user.model"
import cloudinary from "../config/cloudinary"

dotenv.config()

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string

export const registerUser = async (req: Request, res: Response) => {
    try {
        const { firstname, lastname, username, email, password } = req.body

        // Validate required fields
        if (!firstname || !lastname || !username || !email || !password) {
            return res.status(400).json({
                message: "Firstname, lastname, username, email and password are required"
            })
        }

        // Check duplicate email or username
        const existingUser = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { username }]
        })

        if (existingUser) {
            return res.status(400).json({
                message: "Email or username already exists"
            })
        }

        // If an image is uploaded => upload to Cloudinary
        let profilePictureUrl = process.env.DEFAULT_PROFILE_PIC 

        if (req.file) {
            const result: any = await new Promise((resole, reject) => {
                const upload_stream = cloudinary.uploader.upload_stream(
                    { 
                        folder: "profile_pictures",
                        transformation: [
                            { width: 500, height: 500, crop: "limit" },
                            { quality: "auto" },
                            { fetch_format: "auto" }
                        ]
                    },
                    (error, result) => {
                        if (error) {
                            return reject(error)
                        }
                        resole(result)  // success return 
                    }
                )
                upload_stream.end(req.file?.buffer)
            })
        
            profilePictureUrl = result.secure_url
        }

        // Hash password
        const hash = await bcrypt.hash(password, 10)

        const user = await User.create({
            firstname,
            lastname,
            username,
            email,
            password: hash,
            roles: [Role.USER],
            profilePicture: profilePictureUrl
        })

        res.status(201).json({
            message: "User registered successfully",
            data: { email: user.email, roles: user.roles },
        })

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" })
    }
}

export const login = async (req: Request, res:Response) => {
    try {
        const { email, password } = req.body

        // Required fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            })
        }

        // Find user by email only
        const user = await User.findOne({ 
            email: email.toLowerCase().trim() 
        })

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                message: "Invalid email or password"
            })
        }

        const accessToken = signAccessToken(user)
        const refreshToken = signRefreshToken(user)

        res.json({
            message: "Login successful",
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                firstname: user.firstname,
                lastname: user.lastname,
                username: user.username,
                email: user.email,
                roles: user.roles,
                profilePicture: user.profilePicture
            }
        })

    } catch (error: any) {
        res.status(500).json({ message: "Server error" })
    }
}

export const refreshToken = async (req: Request, res: Response) => {
    try {
        const { token } = req.body
        if (!token) {
            return res.status(400).json({ message: "Token required" })
        }

        const payload: any = jwt.verify(token, JWT_REFRESH_SECRET)
        const user = await User.findById(payload.sub)
        if (!user) {
            return res.status(403).json({ message: "Invalid refresh token" })
        }
        const accessToken = signAccessToken(user)

        res.status(200).json({
            accessToken
        })
    } catch (err) {
        res.status(403).json({ message: "Invalid or expired token" })
    }
}

export const getMyProfile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const user = await User.findById(req.user.sub)
            .select("-password -__v")
            .populate({
                path: "badges.language",
                select: "name iconUrl"
            })
            .populate({
                path: "certificates.language",
                select: "name iconUrl"
            })
            .lean()

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        const isAdmin = user.roles.includes(Role.ADMIN)

        // IF ADMIN → Return ONLY basic fields
        if (isAdmin) {
            return res.status(200).json({
                message: "Profile fetched successfully",
                data: {
                    id: user._id,
                    firstname: user.firstname,
                    lastname: user.lastname,
                    username: user.username,
                    email: user.email,
                    profilePicture: user.profilePicture,
                    roles: user.roles
                    // No badges, no certificates, no streaks
                }
            })
        }

        // IF NORMAL USER → Return full profile
        const profileData = {
            id: user._id,
            firstname: user.firstname,
            lastname: user.lastname,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            roles: user.roles,

            badges: (user.badges || []).map((badge: any) => ({
                level: badge.level,
                earnedAt: badge.earnedAt,
                language: {
                    _id: badge.language?._id,
                    name: (badge.language as any)?.name || "Unknown Language",
                    iconUrl: (badge.language as any)?.iconUrl || null
                }
            })),

            certificates: (user.certificates || []).map((cert: any) => ({
                url: cert.url,
                earnedAt: cert.earnedAt,
                language: {
                    _id: cert.language?._id,
                    name: (cert.language as any)?.name || "Unknown Language",
                    iconUrl: (cert.language as any)?.iconUrl || null
                }
            })),

            currentStreak: user.currentStreak || 0,
            longestStreak: user.longestStreak || 0
        }

        return res.status(200).json({
            message: "Profile fetched successfully",
            data: profileData
        })

    } catch (error: any) {
        console.error("getMyProfile Error:", error)
        return res.status(500).json({ message: "Server error" })
    }
}
