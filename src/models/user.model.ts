import mongoose, { Document, Schema } from "mongoose"

export enum Role {
    ADMIN = "ADMIN",
    USER = "USER"
}

export interface IBadge {
    language: mongoose.Types.ObjectId
    level: string
    earnedAt: Date
}

export interface ICertificate {
    language: mongoose.Types.ObjectId
    url: string
    earnedAt: Date
}

export interface IUser extends Document {
    firstname?: string
    lastname?: string
    username: string
    email: string
    password: string
    roles: Role[]
    profilePicture?: string
    badges?: IBadge[]        // only for USERS
    certificates?: ICertificate[]  // only for USERS
    currentStreak?: number    // only for USERS
    longestStreak?: number    // only for USERS
    lastActiveDate?: Date     // only for USERS
}

const userSchema = new Schema<IUser>(
    {
        firstname: { type: String, required: true },
        lastname: { type: String, required: true },
        username: { type: String, unique: true, required: true },
        email: { type: String, unique: true, lowercase: true, required: true },
        password: { type: String, required: true },
        roles: { type: [String], enum: Object.values(Role), default: [Role.USER] },
        profilePicture: { type: String },

        // Only relevant for users
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
        currentStreak: { type: Number, default: 0 },
        longestStreak: { type: Number, default: 0 },
        lastActiveDate: { type: Date },
    },
    { timestamps: true }
)

export const User = mongoose.model<IUser>("User", userSchema)
