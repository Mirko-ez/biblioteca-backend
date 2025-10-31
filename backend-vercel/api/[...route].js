import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Routers
import authRouter from "../src/routes/auth.js";
import booksRouter from "../src/routes/books.js";
import usersRouter from "../src/routes/users.js";

dotenv.config();

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*",
    credentials: true,
  })
);

// IMPORTANTE: acá NO pongas "/api" porque este archivo ya cuelga de /api/*
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, time: new Date().toISOString() });
});

app.use("/auth", authRouter);
app.use("/books", booksRouter);
app.use("/users", usersRouter);

// Bridge de Express -> Vercel Function
export default function handler(req, res) {
  return app(req, res);
}
