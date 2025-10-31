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
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*",
    credentials: true,
  })
);

// Importante: SIN "/api" acá, porque este archivo ya cuelga de /api/* en Vercel
app.get("/health", (req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

app.use("/auth", authRouter);
app.use("/books", booksRouter);
app.use("/users", usersRouter);

// Exportar como handler serverless
export default serverless(app);
