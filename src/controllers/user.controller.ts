import { Request, Response } from "express"
import { AuthRequest } from "../middlewares/auth.middleware"
import { User, Role } from "../models/user.model"
import bcrypt from "bcryptjs"
import cloudinary from "../config/cloudinary"

export const getAllUsers = async (req: AuthRequest, res: Response) => {
    try {
        const users = await User.find()
            .select("-password -__v")
            .lean()

        return res.json({
            message: "Users fetched successfully",
            data: users
        })

    } catch (err) {
        return res.status(500).json({ message: "Server error" })
    }
}

export const getUserById = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.params.id)
            .select("-password -__v")
            .populate("badges.language certificates.language")
            .lean()

        if (!user) return res.status(404).json({ message: "User not found" })

        return res.json({
            message: "User fetched successfully",
            data: user
        })

    } catch (err) {
        return res.status(500).json({ message: "Server error" })
    }
}

export const updateMyProfile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" })

        const { firstname, lastname, username } = req.body

        // Validate username if provided
        if (username) {
            if (username.length < 3 || username.includes(" ")) {
                return res.status(400).json({ message: "Username must be at least 3 chars, no spaces" })
            }

            const existing = await User.findOne({
                username: username.toLowerCase(),
                _id: { $ne: req.user.sub }
            })

            if (existing) {
                return res.status(400).json({ message: "Username already taken" })
            }
        }

        const updated = await User.findByIdAndUpdate(
            req.user.sub,
            {
                firstname,
                lastname,
                username: username ? username.toLowerCase() : undefined,
            },
            { new: true, runValidators: true }
        ).select("-password -__v")

        return res.json({
            message: "Profile updated successfully",
            data: updated
        })

    } catch (err: any) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "Username already taken" })
        }
        return res.status(500).json({ message: "Server error" })
    }
}

export const updateProfilePicture = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" })
        if (!req.file) return res.status(400).json({ message: "Image file is required" })

        // Validate file type and size
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ message: "Only JPEG, PNG, or WebP images allowed" })
        }
        if (req.file.size > 5 * 1024 * 1024) {
            return res.status(400).json({ message: "Image must be under 5MB" })
        }

        const upload: any = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: "profile_pictures",
                    transformation: [
                        { width: 500, height: 500, crop: "limit" },
                        { quality: "auto" },
                        { fetch_format: "auto" }
                    ]
                },
                (err, result) => {
                    if (err) reject(err)
                    else resolve(result)
                }
            )
            stream.end(req.file!.buffer)
        })

        const updatedUser = await User.findByIdAndUpdate(
            req.user.sub,
            { profilePicture: upload.secure_url },
            { new: true }
        ).select("profilePicture firstname username")

        res.json({
            message: "Profile picture updated successfully",
            data: updatedUser
        })

    } catch (err) {
        console.error("Cloudinary upload error:", err)
        return res.status(500).json({ message: "Failed to upload image" })
    }
}

export const changePassword = async (req: AuthRequest, res: Response) => {
    try {
        const { oldPassword, newPassword } = req.body

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Both old and new passwords are required" })
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters" })
        }

        const user = await User.findById(req.user!.sub)
        if (!user) return res.status(404).json({ message: "User not found" })

        const isMatch = await bcrypt.compare(oldPassword, user.password)
        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect" })
        }

        user.password = await bcrypt.hash(newPassword, 12)
        await user.save()

        return res.json({ message: "Password changed successfully" })

    } catch (err) {
        return res.status(500).json({ message: "Server error" })
    }
}

export const updateUserRole = async (req: Request, res: Response) => {
    try {
        const { roles } = req.body

        if (!Array.isArray(roles) || !roles.length) {
            return res.status(400).json({ message: "Valid roles array is required" })
        }

        const validRoles = Object.values(Role)
        const invalid = roles.filter((r: string) => !validRoles.includes(r as Role))
        if (invalid.length > 0) {
            return res.status(400).json({ message: `Invalid roles: ${invalid.join(", ")}` })
        }

        const updated = await User.findByIdAndUpdate(
            req.params.id,
            { roles },
            { new: true }
        ).select("username email roles")

        if (!updated) return res.status(404).json({ message: "User not found" })

        return res.json({
            message: "User roles updated successfully",
            data: updated
        })

    } catch (err) {
        return res.status(500).json({ message: "Server error" })
    }
}

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const deleted = await User.findByIdAndDelete(req.params.id)
        if (!deleted) {
            return res.status(404).json({ message: "User not found" })
        }
        return res.json({ message: "User deleted successfully" })

    } catch (err) {
        return res.status(500).json({ message: "Server error" })
    }
}

export const getUserProfile = async (req: Request, res: Response) => {
    try {
        const { username } = req.params

        const user = await User.findOne({ username: username.toLowerCase() })
            .select("firstname lastname username profilePicture badges certificates createdAt")
            .populate({
                path: "badges.language",
                select: "name iconUrl"
            })
            .populate({
                path: "certificates.language",
                select: "name iconUrl"
            })
            .lean()

        if (!user) return res.status(404).json({ message: "User not found" })

        return res.json({
            message: "Profile fetched successfully",
            data: user
        })

    } catch (err) {
        return res.status(500).json({ message: "Server error" })
    }
}
