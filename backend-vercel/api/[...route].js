// backend-vercel/api/[...route].js
import express from "express";
import serverless from "serverless-http";
import cors from "cors";
import dotenv from "dotenv";

import authRouter from "../src/routes/auth.js";
import booksRouter from "../src/routes/books.js";
import usersRouter from "../src/routes/users.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*", credentials: true }));

// SIN "/api" aquí: este archivo ya cuelga de /api/*
app.get("/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use("/auth", authRouter);
app.use("/books", booksRouter);
app.use("/users", usersRouter);

export default serverless(app);
