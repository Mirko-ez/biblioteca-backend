import express from "express";
import serverless from "serverless-http";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "../src/routes/auth.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "2mb" }));

const origins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true;
app.use(cors({ origin: origins, credentials: true }));

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get("/", (req, res) => res.send("Backend OK"));

app.use("/api/auth", authRouter);

export default serverless(app);
