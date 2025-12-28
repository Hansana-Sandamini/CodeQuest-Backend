import { Schema, model, Types } from "mongoose"

const dailyQuestionSchema = new Schema(
    {
        date: {
            type: String, // YYYY-MM-DD
            required: true,
            unique: true,
        },
        questionId: {
            type: Types.ObjectId,
            ref: "Question",
            required: true,
        },
    },
    { timestamps: true }
)

export const DailyQuestion = model("DailyQuestion", dailyQuestionSchema)
