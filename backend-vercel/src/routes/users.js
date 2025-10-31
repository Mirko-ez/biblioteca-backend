import { Router } from "express";
import { body, validationResult } from "express-validator";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { isValidName } from "../utils/validators.js";

const router = Router();

router.put(
  "/me",
  authRequired,
  body("name").optional().custom(isValidName).withMessage("Nombre inválido"),
  body("photo_url").optional().isString().isLength({ max: 255 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ ok:false, errors: errors.array() });
    const { name, photo_url } = req.body;
    const fields = [];
    const vals = [];
    if (name !== undefined) { fields.push("name=?"); vals.push(name.trim()); }
    if (photo_url !== undefined) { fields.push("photo_url=?"); vals.push(photo_url || null); }
    if (!fields.length) return res.json({ ok:true });
    vals.push(req.user.id);
    try {
      await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id=?`, vals);
      const [[u]] = await pool.query("SELECT id, email, name, role, photo_url FROM users WHERE id=?", [req.user.id]);
      return res.json({ ok:true, user: u });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok:false, message:"Error de servidor" });
    }
  }
);

export default router;