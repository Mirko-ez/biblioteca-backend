// backend-vercel/api/index.js
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
    origin: process.env.CORS_ORIGIN?.split(",") || true,
    credentials: true,
  })
);

// Importante: rutas SIN prefijo /api aquí.
// Vercel mapea este archivo a /api, así que /health => /api/health, etc.
app.get("/health", (_req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

app.use("/auth", authRouter);
app.use("/books", booksRouter);
app.use("/users", usersRouter);

export default serverless(app);
