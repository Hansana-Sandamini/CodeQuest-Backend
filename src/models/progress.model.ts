import mongoose, { Document, Schema } from "mongoose"
import { Difficulty, QuestionType } from "./question.model"

export enum ProgressStatus {
    NOT_STARTED = "NOT_STARTED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    SKIPPED = "SKIPPED",
}

export interface IProgress extends Document {
    user: mongoose.Types.ObjectId
    question: mongoose.Types.ObjectId
    language: mongoose.Types.ObjectId      // For fast stats
    difficulty: Difficulty                 // For streak & badge logic
    type: QuestionType                     // Know if it's MCQ or CODING
    status: ProgressStatus
    attempts: number
    lastAttempted: Date
    completedAt?: Date
    codeSolution?: string      // For CODING questions
    selectedAnswer?: number    // For MCQ (0-4)
    isCorrect: boolean         // Required when completed
    timeSpent: number          // Total seconds spent
    pointsEarned: number       // e.g., 10 for easy, 30 for hard
}

const progressSchema = new Schema<IProgress>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        question: { type: Schema.Types.ObjectId, ref: "Question", required: true },
        language: { type: Schema.Types.ObjectId, ref: "Language", required: true },
        difficulty: { 
            type: String, 
            enum: Object.values(Difficulty), 
            required: true 
        },
        type: { 
            type: String, 
            enum: Object.values(QuestionType), 
            required: true 
        },
        status: {
            type: String,
            enum: Object.values(ProgressStatus),
            default: ProgressStatus.NOT_STARTED,
        },
        attempts: { type: Number, default: 0 },
        lastAttempted: { type: Date },
        completedAt: { type: Date },
        codeSolution: { type: String },
        selectedAnswer: { type: Number },
        isCorrect: { type: Boolean, default: false },
        timeSpent: { type: Number, default: 0 },  // in seconds
        pointsEarned: { type: Number, default: 0 },
    },
    { timestamps: true }
)

// One progress per user per question
progressSchema.index({ user: 1, question: 1 }, { unique: true })

// Fast queries for dashboard (e.g., "show all completed today")
progressSchema.index({ user: 1, status: 1 })
progressSchema.index({ user: 1, completedAt: -1 })
progressSchema.index({ user: 1, difficulty: 1 })

// Fast leaderboard by points
progressSchema.index({ user: 1, pointsEarned: -1 })

export const Progress = mongoose.model<IProgress>("Progress", progressSchema)
