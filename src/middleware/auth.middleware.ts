import { NextFunction, Response } from "express"
import { Role } from "../models/user.model"

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
