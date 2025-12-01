import { GoogleGenerativeAI } from "@google/generative-ai"
import dotenv from "dotenv"

dotenv.config()

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export const getHint = async (questionTitle: string, questionDescription: string, type: "MCQ" | "CODING"): Promise<string> => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
        You are a helpful coding mentor. Give ONLY a short, clever hint (1-2 sentences) for this question.
        NEVER reveal the answer, correct option, or code solution.

        Question Type: ${type}
        Title: ${questionTitle}
        Description: ${questionDescription}

        Give a hint that guides but doesn't spoil:
    `

    try {
        const result = await model.generateContent(prompt)
        const hint = result.response.text().trim()

        // If Gemini accidentally leaks answer, block it
        const dangerousWords = ["answer is", "correct option", "solution is", "code:", "option", "select", "choose"]

        if (dangerousWords.some(word => hint.toLowerCase().includes(word))) {
            return "Think about the core concept behind this problem..."
        }

        return hint || "Try breaking down the problem step by step!"

    } catch (error) {
        console.error("Gemini Error:", error)
        return "Hint: Review the fundamentals of this topic."
    }
}
