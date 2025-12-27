import { Request, Response } from "express"
import { DailyQuestion } from "../models/daily-question.model"
import { Question } from "../models/question.model"

export const getDailyQuestion = async (req: Request, res: Response) => {
    try {
        const today = new Date().toISOString().split("T")[0]

        // Check if today's question already exists
        let daily = await DailyQuestion
            .findOne({ date: today })
            .populate("questionId")

        if (!daily) {
            // Pick random question
            const randomQuestion = await Question.aggregate([
                { $sample: { size: 1 } }
            ])

            if (!randomQuestion.length) {
                return res.status(404).json({
                    success: false,
                    message: "No questions available",
                })
            }

            daily = await DailyQuestion.create({
                date: today,
                questionId: randomQuestion[0]._id,
            })

            daily = await DailyQuestion
                .findOne({ date: today })
                .populate("questionId")
        }

        return res.json({
            success: true,
            question: daily?.questionId,
        })
        
    } catch (error) {
        console.error("Daily Question Error:", error)
        res.status(500).json({
            success: false,
            message: "Failed to fetch daily question",
        })
    }
}
