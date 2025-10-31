// backend-vercel/api/index.js
import express from "express";
import serverless from "serverless-http";
import cors from "cors";
import dotenv from "dotenv";

// Rutas
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

// OJO: sin /api aquí, porque Vercel ya monta este handler en /api
app.get("/health", (req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

// Rutas reales (quedan en /api/auth, /api/books, /api/users)
app.use("/auth", authRouter);
app.use("/books", booksRouter);
app.use("/users", usersRouter);

export default serverless(app);
