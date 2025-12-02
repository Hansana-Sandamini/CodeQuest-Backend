import mongoose, { Document, Schema } from "mongoose"

export enum Role {
    ADMIN = "ADMIN",
    USER = "USER"
}

export interface IUSER extends Document {
    _id: mongoose.Types.ObjectId
    firstname?: string
    lastname?: string
    username: string
    email: string
    password: string
    roles: Role[]
    profilePicture?: string
    badges: {
        language: mongoose.Types.ObjectId
        level: string         
        earnedAt: Date
    }[]
    
    certificates: {
        language: mongoose.Types.ObjectId
        url: string           
        earnedAt: Date
    }[]
}

const userSchema = new Schema<IUSER>(
    {
        firstname: { type: String, required: true },
        lastname: { type: String, required: true },
        username: { type: String, unique: true, required: true },
        email: { type: String, unique: true, lowercase: true, required: true },
        password: { type: String, required: true },
        roles: { type: [String], enum: Object.values(Role), default: [Role.USER] },
        profilePicture: { type: String },
        badges: [
            {
                language: { type: Schema.Types.ObjectId, ref: "Language", required: true },
                level: { type: String, required: true },
                earnedAt: { type: Date, default: Date.now },
            },
        ],
        certificates: [
            {
                language: { type: Schema.Types.ObjectId, ref: "Language", required: true },
                url: { type: String, required: true },
                earnedAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
)

export const User = mongoose.model<IUSER>("User", userSchema)
