import { Request, Response } from "express"
import { Question, Difficulty, QuestionType } from "../models/question.model"
import { Language } from "../models/language.model"

export const createQuestion = async (req: Request, res: Response) => {
    try {
        const {
            language: languageId,
            title,
            description,
            difficulty,
            type,
            options,
            correctAnswer,
            testCases,
        } = req.body

        // Required fields
        if (!languageId || !title || !description || !difficulty || !type) {
            return res.status(400).json({ message: "Missing required fields" })
        }

        // Check if language exists
        const language = await Language.findById(languageId);
        if (!language) {
            return res.status(404).json({ message: "Language not found" })
        }

        // MCQ validation
        if (type === QuestionType.MCQ) {
            if (!Array.isArray(options) || options.length !== 5) {
                return res.status(400).json({ message: "MCQ must have exactly 5 options" })
            }
            if (correctAnswer === undefined || correctAnswer < 0 || correctAnswer > 4) {
                return res.status(400).json({ message: "correctAnswer must be 0–4" })
            }
        }

        // Coding validation
        if (type === QuestionType.CODING) {
            if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
                return res.status(400).json({ message: "At least one test case required" })
            }
        }

        const question = await Question.create({
            language: languageId,
            title: title.trim(),
            description,
            difficulty,
            type,
            options: options?.map((opt: string) => opt.trim()),
            correctAnswer,
            testCases,
        })

        // Add to language
        await Language.findByIdAndUpdate(languageId, { $push: { questions: question._id } })

        // Never return answers or testCases
        const safeQuestion = await Question.findById(question._id)
            .select("-correctAnswer -testCases")
            .populate("language", "name iconUrl")

        res.status(201).json({
            message: "Question created successfully",
            data: safeQuestion,
        })

    } catch (err) {
        console.error("Create Question Error:", err)
        res.status(500).json({ message: "Server error" })
    }
}

export const getQuestions = async (req: Request, res: Response) => {
    try {
        const questions = await Question.find()
            .select("-correctAnswer -testCases")
            .populate("language", "name iconUrl")
            .sort({ createdAt: -1 })

        res.json({ data: questions })

    } catch (err) {
        res.status(500).json({ message: "Server error" })
    }
}

export const getQuestionsByLanguage = async (req: Request, res: Response) => {
    try {
        const { languageId } = req.params
        const { difficulty } = req.query

        const query: any = { language: languageId }
        if (difficulty) query.difficulty = difficulty

        const questions = await Question.find(query)
            .select("-correctAnswer -testCases")
            .populate("language", "name iconUrl")
            .sort({ difficulty: 1, createdAt: -1 })

        res.json({ data: questions })

    } catch (err) {
        res.status(500).json({ message: "Server error" })
    }
}

export const updateQuestion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const updates = req.body

        const allowed = ["title", "description", "difficulty", "options"]
        const safeUpdates: any = {}
        allowed.forEach((field) => {
            if (updates[field] !== undefined) safeUpdates[field] = updates[field]
        })

        const question = await Question.findByIdAndUpdate(
            id,
            { $set: safeUpdates },
            { new: true, runValidators: true }
        )
            .select("-correctAnswer -testCases")
            .populate("language", "name iconUrl")

        if (!question) return res.status(404).json({ message: "Question not found" })

        res.json({ message: "Question updated", data: question })

    } catch (err) {
        res.status(500).json({ message: "Server error" })
    }
}

export const deleteQuestion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        const question = await Question.findById(id)
        if (!question) return res.status(404).json({ message: "Question not found" })

        await Language.findByIdAndUpdate(question.language, {
            $pull: { questions: question._id },
        })

        await question.deleteOne()

        res.json({ message: "Question deleted successfully" })

    } catch (err) {
        res.status(500).json({ message: "Server error" })
    }
}
