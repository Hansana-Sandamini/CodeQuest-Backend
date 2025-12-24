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

    // Only for USERS
    badges?: IBadge[]        
    certificates?: ICertificate[]  
    currentStreak?: number   
    longestStreak?: number    
    lastActiveDate?: Date     

    // Password reset
    resetOtp?: string
    resetOtpExpires?: Date

    googleId?: string
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

        resetOtp: { type: String },
        resetOtpExpires: { type: Date },

        googleId: { type: String, sparse: true, unique: true },
    },
    { timestamps: true }
)

export const User = mongoose.model<IUser>("User", userSchema)
