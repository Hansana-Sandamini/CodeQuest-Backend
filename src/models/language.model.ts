import mongoose, { Document, Schema } from "mongoose"

export interface ILanguage extends Document {
    name: string   // e.g., "Java", "JavaScript"
    description?: string 
    iconUrl?: string
    questions: mongoose.Types.ObjectId[]   // Array of question IDs
}

const languageSchema = new Schema<ILanguage>(
    {
        name: { type: String, required: true, unique: true, trim: true },
        description: { type: String },
        iconUrl: { type: String },
        questions: [{ type: Schema.Types.ObjectId, ref: "Question" }],
    },
    { timestamps: true }
)

export const Language = mongoose.model<ILanguage>("Language", languageSchema)
