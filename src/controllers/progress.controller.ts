import { Request, Response } from "express"
import { AuthRequest } from "../middlewares/auth.middleware"
import { Progress, ProgressStatus } from "../models/progress.model"
import { Question, Difficulty } from "../models/question.model"
import { Role, User } from "../models/user.model"
import { Language } from "../models/language.model"
import { executeCode, languageToId } from "../utils/judge0"
import PDFDocument from "pdfkit"
import cloudinary from "../config/cloudinary"
import mongoose from "mongoose"
import { EmailService } from "../config/mail"
import { Readable } from 'stream'

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

            const lang = await Language.findById(question.language._id)
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
            await updateStreak(userId)
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
    const user = await User.findById(userId)
    if (!user || !user.roles.includes(Role.USER)) return  // skip admins

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

    // Safe default if badges is undefined
    const userBadges = user.badges ?? []

    // Find highest earned badge index for this language
    const earnedLevels = userBadges
        .filter(b => b.language.equals(languageId))
        .map(b => b.level)

    const highestIndex = badgeMilestones.findIndex(
        m => m.level === earnedLevels[earnedLevels.length - 1]
    )

    // Find next badge to award (order-based, NOT percentage-based)
    const nextBadge = badgeMilestones.find((m, index) => {
        return percentage >= m.percent && index > highestIndex
    })

    if (nextBadge) {
        await User.updateOne(
            { _id: userId },
            {
                $push: {
                    badges: {
                        language: languageId,
                        level: nextBadge.level,
                        earnedAt: new Date(),
                    },
                },
            }
        )

        // Send email
        try {
            await EmailService.sendNewBadge(
                user.email,
                user.username,
                nextBadge.level,
                language.name
            )
        } catch (emailErr) {
            console.error(`Failed to send email for badge ${nextBadge.level} to user ${userId}:`, emailErr)
        }
        console.log(`Badge awarded: ${nextBadge.level} (${nextBadge.percent}%) – ${language.name}`)
    }

    // CERTIFICATE ONLY AT 100%
    if (percentage === 100) {
        const hasCertificate = await User.exists({
            _id: userId,
            "certificates.language": languageId,
        })

        if (!hasCertificate) {
            const user = await User.findById(userId).select(
                "firstname lastname username email"
            )
            if (!user) return

            const fullName =
                [user.firstname, user.lastname].filter(Boolean).join(" ").trim() ||
                user.username ||
                "CodeQuest Champion"

            try {
                const certificateUrl = await generateCertificate(
                    fullName,
                    language.name,
                    userId
                )

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

                // Send email
                try {
                    await EmailService.sendNewCertificate(
                        user.email,
                        user.username,
                        language.name,
                        "Mastery",
                        certificateUrl
                    )
                } catch (emailErr) {
                    console.error(`Failed to send certificate email to user ${userId} for language ${language.name}:`, emailErr)
                }

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
            size: 'A4',
            layout: 'landscape',
            margin: 0,
        })

        const chunks: Buffer[] = []
        doc.on('data', (chunk) => chunks.push(chunk as Buffer))
        doc.on('end', async () => {
            const pdfBuffer = Buffer.concat(chunks)

            try {
                const result: any = await new Promise((res, rej) => {
                    cloudinary.uploader
                    .upload_stream(
                        {
                            folder: "codequest_certificates",
                            format: "pdf",
                            resource_type: "raw",
                            public_id: `${userId}_${languageName.toLowerCase().replace(/\s+/g, "_")}_certificate`,
                            overwrite: true,
                        },
                        (error, result) => (error ? rej(error) : res(result))
                    )
                    .end(pdfBuffer)
                })
                resolve(result.secure_url)
            } catch (err) {
                console.error("Cloudinary upload failed:", err)
                reject(err)
            }
        })
        doc.on('error', reject)

        // DIMENSIONS 
        const WIDTH = 842
        const HEIGHT = 595
        const M_TOP = 45
        const M_BOTTOM = 50
        const M_SIDE = 65
        const CONTENT_W = WIDTH - M_SIDE * 2
        const CENTER = WIDTH / 2

        // Background gradient
        doc.rect(0, 0, WIDTH, HEIGHT)
            .fill(doc.linearGradient(0, 0, WIDTH, HEIGHT)
            .stop(0, '#0f172a')
            .stop(0.5, '#1e293b')
            .stop(1, '#0f172a'))

        // Corner accents
        const accent = '#60a5fa'
        doc.lineWidth(1.8).strokeColor(accent)
        const cl = 38 // corner length
        // Top-left
        doc.moveTo(M_SIDE, M_TOP).lineTo(M_SIDE + cl, M_TOP)
        doc.moveTo(M_SIDE, M_TOP).lineTo(M_SIDE, M_TOP + cl)
        // Top-right
        doc.moveTo(WIDTH - M_SIDE, M_TOP).lineTo(WIDTH - M_SIDE - cl, M_TOP)
        doc.moveTo(WIDTH - M_SIDE, M_TOP).lineTo(WIDTH - M_SIDE, M_TOP + cl)
        // Bottom-left + right
        doc.moveTo(M_SIDE, HEIGHT - M_BOTTOM).lineTo(M_SIDE + cl, HEIGHT - M_BOTTOM)
        doc.moveTo(M_SIDE, HEIGHT - M_BOTTOM).lineTo(M_SIDE, HEIGHT - M_BOTTOM - cl)
        doc.moveTo(WIDTH - M_SIDE, HEIGHT - M_BOTTOM).lineTo(WIDTH - M_SIDE - cl, HEIGHT - M_BOTTOM)
        doc.moveTo(WIDTH - M_SIDE, HEIGHT - M_BOTTOM).lineTo(WIDTH - M_SIDE, HEIGHT - M_BOTTOM - cl)
        doc.stroke()

        // CONTENT 
        let y = M_TOP + 15 // start higher

        // 1. Brand
        doc.font('Helvetica-Bold').fontSize(32).fillColor(accent)
            .text('CodeQuest', M_SIDE, y, { width: CONTENT_W, align: 'center' })
        y += 32

        // 2. Subtitle
        doc.font('Helvetica').fontSize(13).fillColor('#94a3b8')
            .text('MASTER CERTIFICATE', M_SIDE, y, { width: CONTENT_W, align: 'center' })
        y += 28

        // 3. Line
        doc.lineWidth(1.2).strokeColor(accent)
            .moveTo(CENTER - 70, y).lineTo(CENTER + 70, y).stroke()
        y += 35

        // 4. Main title
        doc.font('Helvetica-Bold').fontSize(34).fillColor('white')
            .text('CERTIFICATE OF ACHIEVEMENT', M_SIDE, y, { width: CONTENT_W, align: 'center' })
        y += 50

        // 5. Presented to
        doc.font('Helvetica').fontSize(16).fillColor('#cbd5e1')
            .text('This certificate is proudly presented to', M_SIDE, y, { width: CONTENT_W, align: 'center' })
        y += 32

        // 6. Name (dynamic size)
        let nameSize = 50
        if (userName.length > 26) nameSize = 40
        else if (userName.length > 20) nameSize = 44

        doc.font('Helvetica-Bold').fontSize(nameSize).fillColor(accent)
            .text(userName, M_SIDE, y, { width: CONTENT_W, align: 'center' })
        y += nameSize * 1.25

        // 7. For mastering
        doc.font('Helvetica').fontSize(18).fillColor('#e2e8f0')
            .text(`for successfully mastering`, M_SIDE, y, { width: CONTENT_W, align: 'center' })
        y += 38

        // 8. Language badge 
        const badgeW = 340
        const badgeH = 68
        const badgeX = CENTER - badgeW / 2
        const badgeY = y

        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 10)
            .fill('#1e293b')
            .stroke(accent)
            .lineWidth(2)

        let langSize = 34
        if (languageName.length > 18) langSize = 28

        doc.font('Helvetica-Bold').fontSize(langSize).fillColor(accent)
        .text(languageName, badgeX, badgeY + badgeH / 2 - langSize / 2.4, {
            width: badgeW,
            align: 'center',
            lineBreak: false
        })

        y += badgeH + 45

        // 9. Date section
        const dateStr = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })

        doc.font('Helvetica').fontSize(15).fillColor('#cbd5e1')
            .text('Issued on', M_SIDE, y, { width: CONTENT_W, align: 'center' })
        y += 22

        doc.font('Helvetica-Bold').fontSize(20).fillColor('white')
            .text(dateStr, M_SIDE, y, { width: CONTENT_W, align: 'center' })

        // 10. Optional small seal (centered, low)
        const sealY = y + 45
        if (sealY < HEIGHT - M_BOTTOM - 40) {
            doc.circle(CENTER, sealY, 24)
                .fill('#0f172a')
                .stroke(accent)
                .lineWidth(2)

            doc.font('Helvetica-Bold').fontSize(32).fillColor(accent)
                .text('✓', CENTER - 10, sealY - 18)
        }

        // FOOTER
        const footerY = HEIGHT - M_BOTTOM - 35
        doc.font('Helvetica').fontSize(10).fillColor('#cbd5e1')
            .text('Verified by CodeQuest Learning Platform', M_SIDE, footerY, {
                width: CONTENT_W,
                align: 'center'
            })

        const certId = `CQ-${userId.slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
        doc.font('Helvetica').fontSize(8).fillColor('#cbd5e1')
            .text(`Certificate ID: ${certId}`, M_SIDE, footerY + 16, {
                width: CONTENT_W,
                align: 'center'
            })

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

// Helper: Update streak 
async function updateStreak(userId: string) {
    const user = await User.findById(userId)
    if (!user) return

    // Only learners (role USER) get streaks — skip admins
    if (!user.roles.includes(Role.USER)) return

    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize to start of day 

    let currentStreak = user.currentStreak ?? 0
    let longestStreak = user.longestStreak ?? 0

    if (user.lastActiveDate) {
        const lastActive = new Date(user.lastActiveDate)
        lastActive.setHours(0, 0, 0, 0)

        const diffDays = Math.floor(
            (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (diffDays === 1) {
            // Consecutive day → increase streak
            currentStreak += 1
        } else if (diffDays > 1) {
            // Streak broken → reset to 1 (since they solved today)
            currentStreak = 1
        }
        // diffDays === 0 → same day, no change needed
    } else {
        // First time ever solving a question
        currentStreak = 1
    }

    // Update longest streak if current one is bigger
    if (currentStreak > longestStreak) {
        longestStreak = currentStreak
    }

    // Save updated values
    user.currentStreak = currentStreak
    user.longestStreak = longestStreak
    user.lastActiveDate = today

    await user.save()
}
