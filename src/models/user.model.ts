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
    },
    { timestamps: true }
)

export const User = mongoose.model<IUSER>("User", userSchema)
