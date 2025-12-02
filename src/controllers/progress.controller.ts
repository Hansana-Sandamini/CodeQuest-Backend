import { Request, Response } from "express"
import { AuthRequest } from "../middlewares/auth.middleware"
import { Progress, ProgressStatus } from "../models/progress.model"
import { Question, Difficulty } from "../models/question.model"
import { User } from "../models/user.model"
import { Language } from "../models/language.model"
import { executeCode, languageToId } from "../utils/judge0"
import PDFDocument from "pdfkit"
import blobStream from "blob-stream"
import cloudinary from "../config/cloudinary"
import mongoose from "mongoose"

export const submitAnswer = async (req: AuthRequest, res: Response) => {
    try {
        const { id: questionId } = req.params
        const userId = req.user.sub

        const question = await Question.findById(questionId).populate("language", "name")
        if (!question) return res.status(404).json({ message: "Question not found" })

        let progress = await Progress.findOne({ user: userId, question: questionId })

        if (!progress) {
            progress = new Progress({
                user: userId,
                question: questionId,
                language: question.language,
                difficulty: question.difficulty,
                type: question.type,
                status: ProgressStatus.IN_PROGRESS,
                attempts: 0,
                timeSpent: 0,
            })
        }

        progress.attempts += 1
        progress.lastAttempted = new Date()

        let isCorrect = false

        // MCQ Handling 
        if (question.type === "MCQ") {
            const { selectedAnswer } = req.body
            if (selectedAnswer === undefined || selectedAnswer === null)
                return res.status(400).json({ message: "selectedAnswer is required" })

            progress.selectedAnswer = selectedAnswer
            isCorrect = Number(selectedAnswer) === question.correctAnswer

        // CODING Handling 
        } else if (question.type === "CODING") {
            const { code } = req.body
            if (!code) return res.status(400).json({ message: "code is required" })

            progress.codeSolution = code

            const lang = await Language.findById(question.language)
            if (!lang) return res.status(404).json({ message: "Language not found" })

            const languageId = languageToId[lang.name]
            if (!languageId || languageId === 999)
                return res.status(400).json({ message: `Language "${lang.name}" not supported for execution` })

            const { passed } = await executeCode(code, languageId, question.testCases || [])
            isCorrect = passed
        }

        // Update progress status & points
        progress.isCorrect = isCorrect
        if (isCorrect) {
            progress.status = ProgressStatus.COMPLETED
            progress.completedAt = new Date()
            progress.pointsEarned = getPoints(question.difficulty)
        }

        await progress.save()

        // Award badges + certificate
        await awardBadgesAndCertificate(userId, question.language.toString())

        res.json({
            message: "Answer submitted successfully",
            isCorrect,
            pointsEarned: isCorrect ? progress.pointsEarned : 0,
            progress: {
                attempts: progress.attempts,
                isCorrect,
                status: progress.status,
            },
        })
    } catch (err: any) {
        console.error("Submit Answer Error:", err)
        res.status(500).json({ message: "Server error", error: err.message })
    }
}

// Helper: Points per difficulty
function getPoints(difficulty: Difficulty): number {
    switch (difficulty) {
        case Difficulty.EASY: return 10
        case Difficulty.MEDIUM: return 20
        case Difficulty.HARD: return 30
        default: return 0
    }
}

// BADGES & CERTIFICATE LOGIC 
async function awardBadgesAndCertificate(userId: string, languageIdStr: string) {
    const languageObjectId = new mongoose.Types.ObjectId(languageIdStr)

    // Count correctly solved questions in this language
    const completedCount = await Progress.countDocuments({
        user: userId,
        language: languageObjectId,
        isCorrect: true,
    })

    const language = await Language.findById(languageObjectId)
    if (!language) return

    const totalQuestions = language.questions.length

    // Award Badges 
    const milestones: { [key: number]: string } = {
        5: "Novice",
        10: "Intermediate",
        20: "Advanced",
        30: "Expert",
    }

    for (const [count, level] of Object.entries(milestones)) {
        const countNum = parseInt(count)
        if (completedCount >= countNum) {
            const alreadyHasBadge = await User.exists({
                _id: userId,
                "badges.language": languageObjectId,
                "badges.level": level,
            })

            if (!alreadyHasBadge) {
                await User.updateOne(
                    { _id: userId },
                    {
                        $push: {
                            badges: {
                                language: languageObjectId,
                                level,
                                earnedAt: new Date(),
                            },
                        },
                    }
                )
            }
        }
    }

    // Issue Certificate on 100% Completion 
    if (completedCount === totalQuestions && totalQuestions > 0) {
        const alreadyHasCert = await User.exists({
            _id: userId,
            "certificates.language": languageObjectId,
        })

        if (!alreadyHasCert) {
            const user = await User.findById(userId).select("firstname lastname username")
            if (!user) return

            // Build full name properly
            const nameParts = [user.firstname, user.lastname].filter(Boolean)
            const fullName = nameParts.length > 0
                ? nameParts.join(" ").trim()
                : (user.username || "CodeQuest Champion")

            const certUrl = await generateCertificate(fullName, language.name, userId)

            await User.updateOne(
                { _id: userId },
                {
                    $push: {
                        certificates: {
                            language: languageObjectId,
                            url: certUrl,
                            earnedAt: new Date(),
                        },
                    },
                }
            )
        }
    }
}

// PDF Certificate Generator
async function generateCertificate(
    userName: string,
    languageName: string,
    userId: string
): Promise<string> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: "A4",
            layout: "landscape",
            margin: 50,
        })
        const stream = doc.pipe(blobStream())

        // Background
        doc.rect(0, 0, doc.page.width, doc.page.height).fill("#f8f9fa")

        // Title
        doc.fontSize(48)
           .fillColor("#2c3e50")
           .text("Certificate of Completion", { align: "center" })

        // Subtitle
        doc.moveDown(2)
           .fontSize(28)
           .fillColor("#34495e")
           .text("This certifies that", { align: "center" })

        // User Full Name
        doc.moveDown(0.5)
           .fontSize(42)
           .fillColor("#e74c3c")
           .text(userName, { align: "center" })

        // Achievement
        doc.moveDown(1)
           .fontSize(26)
           .fillColor("#2c3e50")
           .text("has successfully mastered all challenges in", { align: "center" })

        doc.moveDown(0.5)
           .fontSize(36)
           .fillColor("#3498db")
           .text(languageName, { align: "center" })

        // Date
        doc.moveDown(3)
           .fontSize(18)
           .fillColor("#7f8c8d")
           .text(`Issued on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, { align: "center" })

        doc.end()

        stream.on("finish", async () => {
            const buffer = stream.toBlob("application/pdf") as unknown as Buffer

            try {
                const result: any = await new Promise((res, rej) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        {
                            folder: "codequest_certificates",
                            format: "pdf",
                            resource_type: "raw",
                            public_id: `${userId}_${languageName.toLowerCase().replace(/\s+/g, "_")}_certificate`,
                            overwrite: true,
                        },
                        (error, result) => {
                            if (error) rej(error)
                            else res(result)
                        }
                    )
                    uploadStream.end(buffer)
                })
                resolve(result.secure_url)
            } catch (err) {
                console.error("Cloudinary upload failed:", err)
                reject(err)
            }
        })

        stream.on("error", reject)
    })
}

// Get User Progress
export const getUserProgress = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.sub
        const progress = await Progress.find({ user: userId })
            .populate({
                path: "question",
                select: "title difficulty type",
            })
            .populate({
                path: "language",
                select: "name iconUrl",
            })
            .sort({ lastAttempted: -1 })

        res.json({ data: progress })
    } catch (err: any) {
        console.error("Get Progress Error:", err)
        res.status(500).json({ message: "Server error" })
    }
}
