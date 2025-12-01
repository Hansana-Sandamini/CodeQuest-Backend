import { Request, Response } from "express"
import { Language } from "../models/language.model"

export const createLanguage = async (req: Request, res: Response) => {
    try {
        const { name, description, iconUrl } = req.body

        const trimmedName = name?.trim()
        if (!trimmedName) {
            return res.status(400).json({ message: "Language name is required" })
        }

        // Case-insensitive duplicate check
        const exists = await Language.findOne({
            name: { $regex: `^${trimmedName}$`, $options: "i" },
        })

        if (exists) {
            return res.status(400).json({ message: "Language already exists" })
        }

        const language = await Language.create({
            name: trimmedName,
            description: description?.trim(),
            iconUrl: iconUrl?.trim(),
        })

        return res.status(201).json({
            message: "Language created successfully",
            data: language,
        })

    } catch (err) {
        console.error("Create Language Error:", err)
        res.status(500).json({ message: "Server error" })
    }
}

export const getLanguages = async (_req: Request, res: Response) => {
    try {
        const languages = await Language.find()
            .select("name description iconUrl questions createdAt")
            .populate("questions", "_id")    // only load IDs to count

        const formatted = languages.map((lang) => ({
            _id: lang._id,
            name: lang.name,
            description: lang.description,
            iconUrl: lang.iconUrl,
            questionCount: lang.questions.length,
        }))

        res.json({ data: formatted })

    } catch (err) {
        console.error("Get Languages Error:", err)
        res.status(500).json({ message: "Server error" })
    }
}

export const getLanguageById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        const language = await Language.findById(id)
            .select("-__v")
            .populate({
                path: "questions",
                select: "title difficulty type createdAt",   // Never expose answers or test cases
            })

        if (!language) {
            return res.status(404).json({ message: "Language not found" })
        }

        res.json({ data: language })

    } catch (err) {
        console.error("Get Language By ID Error:", err)
        res.status(500).json({ message: "Server error" })
    }
}

export const updateLanguage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { name, description, iconUrl } = req.body

        const updates: any = {}

        if (name) updates.name = name.trim()
        if (description) updates.description = description.trim()
        if (iconUrl) updates.iconUrl = iconUrl.trim()

        const language = await Language.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-__v")

        if (!language) {
            return res.status(404).json({ message: "Language not found" })
        }

        res.json({ message: "Language updated successfully", data: language })

    } catch (err: any) {
        console.error("Update Language Error:", err)

        // Duplicate error (name already exists)
        if (err.code === 11000) {
            return res.status(400).json({ message: "Language name already exists" })
        }

        res.status(500).json({ message: "Server error" })
    }
}

export const deleteLanguage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        const language = await Language.findById(id).populate("questions")

        if (!language) {
            return res.status(404).json({ message: "Language not found" })
        }

        // Prevent deleting if it still has questions
        if (language.questions.length > 0) {
            return res.status(400).json({
            	message: "Cannot delete language with existing questions. Remove the questions first.",
            })
        }

        await language.deleteOne()

        res.json({ message: "Language deleted successfully" })

    } catch (err) {
        console.error("Delete Language Error:", err)
        res.status(500).json({ message: "Server error" })
    }
}
