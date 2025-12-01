import { Request, Response } from "express"
import { Question } from "../models/question.model"
import { getHint } from "../utils/gemini"

export const getQuestionHint = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        const question = await Question.findById(id).select("title description type")
        if (!question) {
            return res.status(404).json({ message: "Question not found" })
        }

        const hint = await getHint(
            question.title,
            question.description,
            question.type as "MCQ" | "CODING"
        )

        res.json({
            success: true,
            hint,
            message: "Here's a small hint to guide you!"
        })

    } catch (err) {
        console.error("Hint Error:", err)
        res.status(500).json({ message: "Failed to generate hint" })
    }
}
