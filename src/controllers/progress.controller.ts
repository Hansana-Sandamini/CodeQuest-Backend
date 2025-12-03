import { Request, Response } from "express"
import { AuthRequest } from "../middlewares/auth.middleware"
import { Progress, ProgressStatus } from "../models/progress.model"
import { Question, Difficulty } from "../models/question.model"
import { User } from "../models/user.model"
import { Language } from "../models/language.model"
import { executeCode, languageToId } from "../utils/judge0"
import PDFDocument from "pdfkit"
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
                language: question.language._id,
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
        await awardBadgesAndCertificate(userId, question.language._id.toString())

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

// BADGES (20–80%) + CERTIFICATE ONLY AT 100%
async function awardBadgesAndCertificate(userId: string, languageIdStr: string) {
    const languageId = new mongoose.Types.ObjectId(languageIdStr)

    // Get language + total questions
    const language = await Language.findById(languageId).select("name questions")
    if (!language || language.questions.length === 0) return

    const totalQuestions = language.questions.length

    // Count correctly solved questions
    const completedCount = await Progress.countDocuments({
        user: userId,
        language: languageId,
        isCorrect: true,
        status: ProgressStatus.COMPLETED,
    })

    const percentage = Math.round((completedCount / totalQuestions) * 100)

    // Badge milestones
    const badgeMilestones = [
        { percent: 20, level: "Bronze Learner", color: "#CD7F32" },
        { percent: 40, level: "Silver Coder", color: "#C0C0C0" },
        { percent: 60, level: "Gold Developer", color: "#FFD700" },
        { percent: 80, level: "Platinum Master", color: "#E5E4E2" },
    ]

    // Award badges if milestone reached and not already owned
    for (const milestone of badgeMilestones) {
        if (percentage >= milestone.percent) {
            const exists = await User.exists({
                _id: userId,
                "badges.language": languageId,
                "badges.level": milestone.level,
            })

            if (!exists) {
                await User.updateOne(
                    { _id: userId },
                    {
                        $push: {
                            badges: {
                                language: languageId,
                                level: milestone.level,
                                percentage: milestone.percent,
                                color: milestone.color,
                                earnedAt: new Date(),
                            },
                        },
                    }
                )
                console.log(`Badge awarded: ${milestone.level} (${milestone.percent}%) – ${language.name}`)
            }
        }
    }

    // CERTIFICATE ONLY AT 100%
    if (percentage === 100) {
        const hasCertificate = await User.exists({
            _id: userId,
            "certificates.language": languageId,
        })

        if (!hasCertificate) {
            const user = await User.findById(userId).select("firstname lastname username")
            if (!user) return

            const fullName =
                [user.firstname, user.lastname].filter(Boolean).join(" ").trim() ||
                user.username ||
                "CodeQuest Champion"

            try {
                const certificateUrl = await generateCertificate(fullName, language.name, userId)

                await User.updateOne(
                    { _id: userId },
                    {
                        $push: {
                            certificates: {
                                language: languageId,
                                url: certificateUrl,
                                earnedAt: new Date(),
                            },
                        },
                    }
                )

                console.log(`Certificate issued: ${fullName} mastered ${language.name}!`)
            } catch (err) {
                console.error("Certificate generation failed:", err)
            }
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

        const chunks: Buffer[] = []
        doc.on("data", (chunk) => chunks.push(chunk as Buffer))
        doc.on("end", async () => {
            const pdfBuffer = Buffer.concat(chunks)

            try {
                const result: any = await new Promise((res, rej) => {
                    cloudinary.uploader.upload_stream(
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
                    ).end(pdfBuffer)
                })
                resolve(result.secure_url)
            } catch (err) {
                console.error("Cloudinary upload failed:", err)
                reject(err)
            }
        })

        doc.on("error", reject)

        const pageWidth = doc.page.width
        const centerX = pageWidth / 2

        // Background
        doc.rect(0, 0, pageWidth, doc.page.height).fill("#f8f9fa")

        // Title 
        doc.fontSize(48)
           .fillColor("#2c3e50")
           .text("Certificate of Completion", 0, 120, {
               width: pageWidth,
               align: "center",
           })

        // Subtitle
        doc.fontSize(28)
           .fillColor("#34495e")
           .text("This certifies that", 0, 220, {
               width: pageWidth,
               align: "center",
           })

        // User Full Name
        doc.fontSize(42)
           .fillColor("#e74c3c")
           .text(userName, 0, 280, {
               width: pageWidth,
               align: "center",
           })

        // Achievement
        doc.fontSize(26)
           .fillColor("#2c3e50")
           .text("has successfully mastered all challenges in", 0, 360, {
               width: pageWidth,
               align: "center",
           })

        // Language Name
        doc.fontSize(36)
           .fillColor("#3498db")
           .text(languageName, 0, 410, {
               width: pageWidth,
               align: "center",
           })

        // Date
        doc.fontSize(18)
           .fillColor("#7f8c8d")
           .text(
               `Issued on ${new Date().toLocaleDateString("en-US", {
                   year: "numeric",
                   month: "long",
                   day: "numeric",
               })}`,
               0,
               500,
               {
                   width: pageWidth,
                   align: "center",
               }
           )

        doc.end()
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
