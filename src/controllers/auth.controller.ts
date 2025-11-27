import { Request, Response } from "express"
import { AuthRequest } from "../middlewares/auth.middleware"

export const registerUser = async (req: Request, res: Response) => {}

export const login = async (req: Request, res:Response) => {}

export const refreshToken = async (req: Request, res: Response) => {}

export const getMyProfile = async (req: AuthRequest, res:Response) => {}
