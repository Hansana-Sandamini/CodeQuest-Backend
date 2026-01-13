# CodeQuest Backend 🚀

🔗 **Frontend Repository:** https://github.com/Hansana-Sandamini/CodeQuest-Frontend

## 📌 Project Overview

CodeQuest is a full-stack coding practice and learning platform where users can solve coding and MCQ questions across multiple programming languages, earn badges and certificates, view leaderboards, and participate in daily challenges.

This repository contains the **backend API** built using **Node.js, Express, TypeScript, and MongoDB**.

---

## 🌟 Features

* 🔐 JWT Authentication (Access, Refresh & Reset Tokens)
* 👥 Role-based access (Admin & User)
* 🌍 Programming Languages Management
* ❓ Questions categorized by difficulty (Easy, Medium, Hard)
* 🧠 Coding execution using **Judge0 API**
* 🤖 AI-powered hints using **Google Gemini API**
* 🏆 Badges & Certificates on language completion
* 📊 User leaderboard with ranking system
* 📅 Daily Question feature
* 📧 Real-time email notifications via **Nodemailer**
* ☁️ Image uploads using **Cloudinary**
* 🔑 Google OAuth authentication

---

## 🛠 Tech Stack

| Layer                | Technology / Tools                      |
| -------------------- | --------------------------------------- |
| Backend              | Node.js, Express.js, TypeScript         |
| Database             | MongoDB Atlas, Mongoose                 |
| Authentication       | JWT, bcrypt, Passport.js (Google OAuth) |
| Email Service        | Nodemailer (SMTP)                       |
| AI Integration       | Google Gemini API                       |
| Code Execution       | Judge0 (RapidAPI)                       |
| Image Hosting        | Cloudinary                              |
| Deployment           | Vercel / Render                         |
| Testing / API Client | Postman                                 |
| Version Control      | Git, GitHub                             |

---

## 🌐 Deployed URLs

* **Backend:** [https://code-quest-be-three.vercel.app](https://code-quest-be-three.vercel.app)
* **Frontend:** [https://code-quest-pied.vercel.app](https://code-quest-pied.vercel.app)

---

## ⚙️ Setup Instructions

### 1️⃣ Clone Backend Repo

```bash
git clone https://github.com/Hansana-Sandamini/CodeQuest-Backend.git
cd codequest-be
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Create `.env` file

Create a `.env` file in the root directory with the following content:

```env
# Server Port
PORT=5000

# MongoDB Connection String
MONGO_URI=your_mongodb_connection_string

# JWT Secrets
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_RESET_SECRET=your_reset_secret

# Cloudinary Image Upload Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# Default Profile Picture URL
DEFAULT_PROFILE_PIC=https://your-default-image-url

# Google Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key

# Judge0 API Key (via RapidAPI)
RAPIDAPI_KEY=your_judge0_api_key

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com         # SMTP Host
SMTP_PORT=587                    # SMTP Port
SMTP_USER=your_email@gmail.com   # Your Email
SMTP_PASS=your_email_app_password # App Password or SMTP Password

# Frontend URL
FRONTEND_URL=https://code-quest-pied.vercel.app

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Environment
NODE_ENV=development
```

### 4️⃣ Run Project

* Development: `npm run dev`
* Production: `npm run build && npm start`

---

## 📂 Project Structure

<pre>
CODEQUEST-BE/
├── node_modules/                   # Contains all installed npm packages required to run the backend application
├── src/
│   ├── config/                     # Application & third-party configurations
│   ├── controllers/                # Business logic handlers
│   ├── middlewares/                # Custom middlewares
│   ├── models/                     # Mongoose schemas & models
│   ├── routes/                     # API route definitions
│   ├── utils/                      # Utility helpers
│   └── index.ts                    # Application entry point
├── .env                            # Environment variables
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
</pre>

---

## 🗄️ MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2. Create a new project and build a free-tier cluster.
3. Create a database user with a username and password.
4. Whitelist your IP or allow access from anywhere (0.0.0.0/0).
5. Copy the connection string and use it as `MONGO_URI` in `.env`.

---

## ☁️ Deployment on Vercel / Render

1. Push backend repository to GitHub.
2. Create a new project on Vercel (or Render) and connect your GitHub repo.
3. Add all `.env` variables in the deployment settings.
4. Set build command: `npm run build` and start command: `npm start`.
5. Deploy and copy the backend URL to share with frontend.
