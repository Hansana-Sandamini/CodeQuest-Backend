import mongoose, { Document, Schema } from "mongoose"

export enum Difficulty {
    EASY = "EASY",
    MEDIUM = "MEDIUM",
    HARD = "HARD",
}

export enum QuestionType {
    MCQ = "MCQ",
    CODING = "CODING",
}

export interface IQuestion extends Document {
    language: mongoose.Types.ObjectId   // Reference to Language
    title: string
    description: string
    difficulty: Difficulty
    type: QuestionType
    options?: string[]   // For MCQ: 4 options
    correctAnswer?: number   // For MCQ: Index of correct option (0-3)
    testCases?: { input: string; expectedOutput: string }[]   // For CODING
}

const questionSchema = new Schema<IQuestion>(
    {
        language: { type: Schema.Types.ObjectId, ref: "Language", required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        difficulty: { type: String, enum: Object.values(Difficulty), required: true },
        type: { type: String, enum: Object.values(QuestionType), required: true },
        options: [{ type: String }],  // Required for MCQ
        correctAnswer: { type: Number },  // Required for MCQ
        testCases: [{ input: { type: String }, expectedOutput: { type: String } }],  // Required for CODING
    },
    { timestamps: true }
)

export const Question = mongoose.model<IQuestion>("Question", questionSchema)
