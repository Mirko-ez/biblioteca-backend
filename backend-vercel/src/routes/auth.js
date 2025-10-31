import { Router } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { createRefreshToken, verifyRefreshToken, rotateRefreshToken, revokeRefreshToken } from "../utils/tokens.js";
import { isAllowedSignupDomain, isGmailOnly, isValidName, isValidPassword } from "../utils/validators.js";

const router = Router();
// 🔎 Ruta de diagnóstico para comprobar que /api/auth está montado
router.get("/ping", (req, res) => {
  res.json({ ok: true, scope: "auth" });
});

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, photo_url: user.photo_url },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "7d" }
  );
}

/* ===========================
   POST /api/auth/register
   Rules:
   - name: only letters (min 4)
   - email domain: gmail.com, yahoo.com, hotmail.com
   - password: min 6 chars
   - auto-login (returns token)
=========================== */
router.post(
  "/register",
  body("name").custom(isValidName).withMessage("Nombre inválido"),
  body("email").isEmail().withMessage("Email inválido"),
  body("password").custom(isValidPassword).withMessage("Password débil"),
  body("role").optional().isIn(["BIBLIOTECARIO","AUTOR","USUARIO"]),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, errors: errors.array() });
    }
    const { name, email, password, role = "USUARIO" } = req.body;
    if (!isAllowedSignupDomain(email)) {
      return res.status(400).json({ ok: false, message: "Dominio no permitido para registro" });
    }
    try {
      const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
      if (existing.length) return res.status(409).json({ ok: false, message: "Email ya registrado" });
      const hash = bcrypt.hashSync(password, 12); // ~60 chars
      const [result] = await pool.query(
        "INSERT INTO users (name, email, password_hash, provider, role) VALUES (?,?,?,?,?)",
        [name.trim(), email.toLowerCase(), hash, "local", role]
      );
      const user = { id: result.insertId, name, email: email.toLowerCase(), role, photo_url: null };

function withTokens(user){
  const access = signToken(user);
  return createRefreshToken(user.id).then(rt => ({ access_token: access, refresh_token: rt.token, user }));
}

      const pack = await withTokens(user);
      return res.json({ ok: true, token: pack.access_token, refresh_token: pack.refresh_token, user: pack.user });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ ok: false, message: "Error de servidor" });
    }
  }
);

/* ===========================
   POST /api/auth/login
   Rules:
   - ONLY gmail.com allowed for local password login
   - On mismatch -> "Credenciales inválidas"
=========================== */
router.post(
  "/login",
  body("email").isEmail(),
  body("password").isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });

    const { email, password } = req.body;
    if (!isGmailOnly(email)) {
      return res.status(400).json({ ok: false, message: "Credenciales inválidas" });
    }
    try {
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
      if (!rows.length) return res.status(401).json({ ok: false, message: "Credenciales inválidas" });
      const user = rows[0];
      if (!user.password_hash) return res.status(401).json({ ok: false, message: "Use Google para iniciar sesión" });
      const ok = bcrypt.compareSync(password, user.password_hash);
      if (!ok) return res.status(401).json({ ok: false, message: "Credenciales inválidas" });
      const payload = { id: user.id, email: user.email, name: user.name, role: user.role, photo_url: user.photo_url };
      const pack = await withTokens(payload);
      return res.json({ ok: true, token: pack.access_token, refresh_token: pack.refresh_token, user: pack.user });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ ok: false, message: "Error de servidor" });
    }
  }
);

/* ===========================
   POST /api/auth/google
   Expect: id, email, name, photo_url (verified client-side with Google; optional server verification to add later)
=========================== */
router.post(
  "/google",
  body("email").isEmail(),
  body("name").custom(isValidName),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });

    const { email, name, photo_url } = req.body;
    try {
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
      let user;
      if (rows.length) {
        user = rows[0];
        // force provider to google if first-time linking
        if (user.provider !== "google") {
          await pool.query("UPDATE users SET provider='google', photo_url=? WHERE id=?", [photo_url || user.photo_url, user.id]);
        }
      } else {
        const [result] = await pool.query(
          "INSERT INTO users (name, email, provider, role, photo_url) VALUES (?,?,?,?,?)",
          [name.trim(), email.toLowerCase(), "google", "USUARIO", photo_url || null]
        );
        user = { id: result.insertId, name, email: email.toLowerCase(), role: "USUARIO", photo_url: photo_url || null };
      }
      const payload = { id: user.id, email: email.toLowerCase(), name, role: user.role, photo_url: photo_url || user.photo_url };
      const pack = await withTokens(payload);
      return res.json({ ok: true, token: pack.access_token, refresh_token: pack.refresh_token, user: pack.user });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ ok: false, message: "Error de servidor" });
    }
  }
);

export default router;

/* ===========================
   POST /api/auth/refresh
   Body: { user_id, refresh_token }
=========================== */
router.post("/refresh", async (req,res)=>{
  const { user_id, refresh_token } = req.body || {};
  if(!user_id || !refresh_token) return res.status(400).json({ ok:false, message:"Datos faltantes" });
  try {
    const row = await verifyRefreshToken(user_id, refresh_token);
    if(!row) return res.status(401).json({ ok:false, message:"Refresh inválido" });
    const [[u]] = await pool.query("SELECT id, email, name, role, photo_url FROM users WHERE id=?", [user_id]);
    if(!u) return res.status(404).json({ ok:false, message:"Usuario no encontrado" });
    const payload = { id:u.id, email:u.email, name:u.name, role:u.role, photo_url:u.photo_url };
    const access_token = signToken(payload);
    const rotated = await rotateRefreshToken(user_id, row.id);
    return res.json({ ok:true, token: access_token, refresh_token: rotated.token, user: payload });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, message:"Error de servidor" });
  }
});

/* ===========================
   POST /api/auth/logout
   Body: { user_id, refresh_token }
=========================== */
router.post("/logout", async (req,res)=>{
  const { user_id, refresh_token } = req.body || {};
  if(!user_id || !refresh_token) return res.status(400).json({ ok:false, message:"Datos faltantes" });
  try {
    await revokeRefreshToken(user_id, refresh_token);
    return res.json({ ok:true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, message:"Error de servidor" });
  }
});
