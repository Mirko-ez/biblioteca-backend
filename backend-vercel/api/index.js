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
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || true, credentials: true }));

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", authRouter);
app.use("/api/books", booksRouter);

app.use("/api/users", usersRouter);

export default serverless(app);