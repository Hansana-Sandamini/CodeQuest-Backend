import { NextFunction, Request, Response } from "express"
import { Role } from "../models/user.model"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET as string

export interface AuthRequest extends Request {
    user?: any
}

export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    // Check if the user's roles contain at least one allowed role
    const hasRole = req.user.roles.some((role: Role) =>
      allowedRoles.includes(role as Role)
    )

    if (!hasRole) {
      return res.status(403).json({ message: `Requires one of these roles: ${allowedRoles.join(", ")}` })
    }

    next()
  }
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res.status(401).json({message: "No token provided"})
    }

    // Bearer rtyuilkjkhpoiuytsdfghjk
    const token = authHeader.split(" ")[1]   

    try {
        const payload = jwt.verify(token, JWT_SECRET)
        req.user = payload
        next()

    } catch (err) {
        console.error(err)
        return res.status(403).json({message: "Invalid or expired token"})
    }
}
