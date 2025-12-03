import { Request, Response } from "express"
import { Progress } from "../models/progress.model"
import { User } from "../models/user.model"
import { AuthRequest } from "../middlewares/auth.middleware"
import { Types } from "mongoose"

export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10

        // Aggregate total points per user
        const leaderboard = await Progress.aggregate([
            {
                $group: {
                    _id: "$user",
                    totalPoints: { $sum: "$pointsEarned" },
                },
            },
            { $sort: { totalPoints: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            {
                $project: {
                    _id: 0,
                    userId: "$user._id",
                    username: "$user.username",
                    profilePicture: "$user.profilePicture",
                    totalPoints: 1,
                    badgesCount: { $size: "$user.badges" },
                },
            },
        ])

        res.json({ data: leaderboard })
    } catch (err) {
        console.error("Leaderboard Error:", err)
        res.status(500).json({ message: "Server error" })
    }
}

export const getMyRank = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const userIdString = req.user.sub
        const userObjectId = new Types.ObjectId(userIdString)

        const userProgress = await Progress.aggregate([
            { $match: { user: userObjectId } },
            {
                $group: {
                    _id: "$user",
                    totalPoints: { $sum: "$pointsEarned" },
                },
            },
        ])

        const myPoints = userProgress[0]?.totalPoints ?? 0

        const betterUsers = await Progress.aggregate([
            {
                $group: {
                    _id: "$user",
                    totalPoints: { $sum: "$pointsEarned" },
                },
            },
            { $match: { totalPoints: { $gt: myPoints } } },
            { $count: "count" },
        ])

        const rank = (betterUsers[0]?.count ?? 0) + 1

        const user = await User.findById(userIdString).select("username profilePicture badges")

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        res.json({
            data: {
                rank,
                userId: user._id,
                username: user.username,
                profilePicture: user.profilePicture,
                totalPoints: myPoints,
                badgesCount: user.badges?.length || 0,
            },
        })

    } catch (err) {
        console.error("Get My Rank Error:", err)
        res.status(500).json({ message: "Server error" })
    }
}
