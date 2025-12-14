import nodemailer from "nodemailer"
import dotenv from "dotenv"

dotenv.config()

export const mailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

export enum EmailType {
    PASSWORD_RESET = "PASSWORD_RESET",
    WELCOME = "WELCOME",
    NEW_BADGE = "NEW_BADGE",
    NEW_CERTIFICATE = "NEW_CERTIFICATE",
    STREAK_REMINDER = "STREAK_REMINDER"
}

interface EmailOptions {
    to: string
    subject: string
    html: string
    text?: string
}

const sendEmail = async (options: EmailOptions): Promise<boolean> => {
    try {
        const mailOptions = {
            from: `"CodeQuest" <${process.env.SMTP_USER}>`,
            ...options
        }

        const info = await mailTransporter.sendMail(mailOptions)
        console.log(`✅ Email sent to ${options.to}: ${info.messageId}`)
        return true
    } catch (error) {
        console.error("❌ Error sending email:", error)
        throw error
    }
}

export const sendEmailService = async (
    type: EmailType,
    to: string,
    data: any
): Promise<boolean> => {
    let emailOptions: EmailOptions

    switch (type) {
        case EmailType.PASSWORD_RESET:
            emailOptions = getPasswordResetEmail(to, data.token)
            break
        
        case EmailType.WELCOME:
            emailOptions = getWelcomeEmail(to, data.username)
            break

        case EmailType.NEW_BADGE:
            emailOptions = getNewBadgeEmail(to, data)
            break
        
        case EmailType.NEW_CERTIFICATE:
            emailOptions = getNewCertificateEmail(to, data)
            break
        
        case EmailType.STREAK_REMINDER:
            emailOptions = getStreakReminderEmail(to, data)
            break
        
        default:
            throw new Error("Unknown email type")
    }
    
    return await sendEmail(emailOptions)
}

// ============= EMAIL TEMPLATES =============

const getPasswordResetEmail = (to: string, token: string): EmailOptions => {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`
    
    return {
        to,
        subject: "Password Reset Request - CodeQuest",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #4F46E5; margin: 0;">CodeQuest</h1>
                    <p style="color: #6B7280; margin-top: 5px;">Level up your coding skills</p>
                </div>
                
                <h2 style="color: #111827;">Password Reset Request</h2>
                <p style="color: #4B5563; line-height: 1.6;">
                    You requested to reset your password for your CodeQuest account.
                    Click the button below to reset your password. This link will expire in 15 minutes.
                </p>
                
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${resetLink}" 
                       style="background-color: #4F46E5; color: white; padding: 14px 28px; 
                              text-decoration: none; border-radius: 8px; font-weight: bold;
                              font-size: 16px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                
                <p style="color: #6B7280; font-size: 14px; text-align: center;">
                    If you didn't request this, you can safely ignore this email.
                </p>
                
                <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
                
                <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
                    Or copy and paste this link in your browser:<br>
                    <span style="color: #4F46E5; word-break: break-all;">${resetLink}</span>
                </p>
            </div>
        `,
        text: `Password Reset Request\n\nClick to reset your password: ${resetLink}\n\nThis link expires in 15 minutes.`
    }
}

const getWelcomeEmail = (to: string, username: string): EmailOptions => {
    return {
        to,
        subject: "Welcome to CodeQuest! 🎉",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #4F46E5; margin: 0;">Welcome to CodeQuest! 🎉</h1>
                </div>
                
                <p style="color: #4B5563; line-height: 1.6;">
                    Hello <strong>${username}</strong>,
                </p>
                
                <p style="color: #4B5563; line-height: 1.6;">
                    Welcome to CodeQuest! We're excited to have you join our community of coders.
                    Get ready to level up your programming skills through fun challenges and interactive learning.
                </p>
                
                <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #111827; margin-top: 0;">Getting Started:</h3>
                    <ul style="color: #4B5563;">
                        <li>Complete your first coding challenge</li>
                        <li>Earn badges and certificates</li>
                        <li>Track your coding streak</li>
                        <li>Join the leaderboard competition</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${process.env.FRONTEND_URL}/challenges" 
                       style="background-color: #10B981; color: white; padding: 14px 28px; 
                              text-decoration: none; border-radius: 8px; font-weight: bold;
                              font-size: 16px; display: inline-block;">
                        Start Your First Challenge
                    </a>
                </div>
                
                <p style="color: #6B7280; font-size: 14px;">
                    Happy coding!<br>
                    The CodeQuest Team
                </p>
            </div>
        `,
        text: `Welcome to CodeQuest!\n\nHello ${username},\n\nWelcome to CodeQuest! Start your coding journey now at ${process.env.FRONTEND_URL}\n\nHappy coding!\nThe CodeQuest Team`
    }
}

const getNewBadgeEmail = (to: string, data: { username: string, badgeName: string, language: string }): EmailOptions => {
    return {
        to,
        subject: `🏆 New Badge Earned: ${data.badgeName}!`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #F59E0B; margin: 0;">🏆 New Badge Earned!</h1>
                </div>
                
                <p style="color: #4B5563; line-height: 1.6;">
                    Congratulations <strong>${data.username}</strong>!
                </p>
                
                <p style="color: #4B5563; line-height: 1.6;">
                    You've earned the <strong>${data.badgeName}</strong> badge in <strong>${data.language}</strong>!
                    Keep up the great work and continue leveling up your skills.
                </p>
                
                <div style="background: linear-gradient(135deg, #F59E0B, #FBBF24); 
                            padding: 30px; border-radius: 12px; text-align: center; 
                            color: white; margin: 25px 0;">
                    <div style="font-size: 48px; margin-bottom: 15px;">🏆</div>
                    <h2 style="margin: 0; color: white;">${data.badgeName}</h2>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">${data.language}</p>
                </div>
                
                <p style="color: #4B5563; line-height: 1.6;">
                    Share your achievement with friends and keep pushing forward to earn more badges!
                </p>
                
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${process.env.FRONTEND_URL}/profile" 
                       style="background-color: #4F46E5; color: white; padding: 14px 28px; 
                              text-decoration: none; border-radius: 8px; font-weight: bold;
                              font-size: 16px; display: inline-block;">
                        View Your Profile
                    </a>
                </div>
                
                <p style="color: #6B7280; font-size: 14px;">
                    Keep coding!<br>
                    The CodeQuest Team
                </p>
            </div>
        `,
        text: `🏆 New Badge Earned!\n\nCongratulations ${data.username}!\n\nYou've earned the ${data.badgeName} badge in ${data.language}!\n\nView your profile: ${process.env.FRONTEND_URL}/profile`
    }
}

const getNewCertificateEmail = (to: string, data: { username: string, language: string, level: string }): EmailOptions => {
    return {
        to,
        subject: `🎓 Certificate Earned in ${data.language}!`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #10B981; margin: 0;">🎓 Certificate Earned!</h1>
                </div>
                
                <p style="color: #4B5563; line-height: 1.6;">
                    Amazing work <strong>${data.username}</strong>!
                </p>
                
                <p style="color: #4B5563; line-height: 1.6;">
                    You've successfully completed the <strong>${data.level}</strong> level in 
                    <strong>${data.language}</strong> and earned a certificate!
                    This is a significant milestone in your coding journey.
                </p>
                
                <div style="border: 2px dashed #10B981; padding: 30px; border-radius: 12px; 
                            text-align: center; margin: 25px 0; background-color: #F0FDF4;">
                    <div style="font-size: 48px; margin-bottom: 15px; color: #10B981;">🎓</div>
                    <h2 style="margin: 0; color: #065F46;">Certificate of Completion</h2>
                    <p style="margin: 10px 0 0 0; color: #059669;">
                        ${data.language} - ${data.level} Level
                    </p>
                    <p style="margin: 5px 0; color: #6B7280; font-style: italic;">
                        Awarded to ${data.username}
                    </p>
                </div>
                
                <p style="color: #4B5563; line-height: 1.6;">
                    Your certificate is now available in your profile. You can download it and share it on LinkedIn!
                </p>
                
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${process.env.FRONTEND_URL}/certificates" 
                       style="background-color: #10B981; color: white; padding: 14px 28px; 
                              text-decoration: none; border-radius: 8px; font-weight: bold;
                              font-size: 16px; display: inline-block;">
                        View Your Certificate
                    </a>
                </div>
                
                <p style="color: #6B7280; font-size: 14px;">
                    Congratulations on this achievement!<br>
                    The CodeQuest Team
                </p>
            </div>
        `,
        text: `🎓 Certificate Earned!\n\nCongratulations ${data.username}!\n\nYou've earned a ${data.level} level certificate in ${data.language}!\n\nView your certificate: ${process.env.FRONTEND_URL}/certificates`
    }
}

const getStreakReminderEmail = (to: string, data: { username: string, currentStreak: number }): EmailOptions => {
    return {
        to,
        subject: `🔥 Don't Break Your ${data.currentStreak}-Day Streak!`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #EF4444; margin: 0;">🔥 Streak Reminder</h1>
                </div>
                
                <p style="color: #4B5563; line-height: 1.6;">
                    Hey <strong>${data.username}</strong>,
                </p>
                
                <p style="color: #4B5563; line-height: 1.6;">
                    You're on a <strong>${data.currentStreak}-day coding streak</strong>! 🎉
                    Don't break it now - complete a challenge today to keep your streak alive.
                </p>
                
                <div style="background: linear-gradient(135deg, #EF4444, #F97316); 
                            padding: 30px; border-radius: 12px; text-align: center; 
                            color: white; margin: 25px 0;">
                    <div style="font-size: 48px; margin-bottom: 15px;">🔥</div>
                    <h2 style="margin: 0; font-size: 36px; color: white;">
                        ${data.currentStreak} Days
                    </h2>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Current Coding Streak</p>
                </div>
                
                <p style="color: #4B5563; line-height: 1.6;">
                    "Consistency is key to mastery." Complete just one challenge today to maintain your progress.
                </p>
                
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${process.env.FRONTEND_URL}/practice" 
                       style="background-color: #EF4444; color: white; padding: 14px 28px; 
                              text-decoration: none; border-radius: 8px; font-weight: bold;
                              font-size: 16px; display: inline-block;">
                        Continue Your Streak
                    </a>
                </div>
                
                <p style="color: #6B7280; font-size: 14px;">
                    Keep up the great work!<br>
                    The CodeQuest Team
                </p>
            </div>
        `,
        text: `🔥 Streak Reminder!\n\nHey ${data.username},\n\nYou're on a ${data.currentStreak}-day coding streak! Complete a challenge today to keep it alive.\n\nContinue your streak: ${process.env.FRONTEND_URL}/practice`
    }
}

export const EmailService = {
    send: sendEmailService,
    types: EmailType,
    
    sendPasswordReset: (to: string, token: string) => 
        sendEmailService(EmailType.PASSWORD_RESET, to, { token }),
    
    sendWelcome: (to: string, username: string) => 
        sendEmailService(EmailType.WELCOME, to, { username }),
    
    sendNewBadge: (to: string, username: string, badgeName: string, language: string) => 
        sendEmailService(EmailType.NEW_BADGE, to, { username, badgeName, language }),
    
    sendNewCertificate: (to: string, username: string, language: string, level: string) => 
        sendEmailService(EmailType.NEW_CERTIFICATE, to, { username, language, level }),
    
    sendStreakReminder: (to: string, username: string, currentStreak: number) => 
        sendEmailService(EmailType.STREAK_REMINDER, to, { username, currentStreak }),
}
