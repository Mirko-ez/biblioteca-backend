import { Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import pool from "../db.js";
import { authRequired, roleRequired } from "../middleware/auth.js";

const router = Router();
const PAGE_SIZE = 20;

router.get(
  "/",
  query("q").optional().isString(),
  query("page").optional().isInt({ min: 1 }),
  async (req, res) => {
    const q = (req.query.q || "").trim();
    const page = parseInt(req.query.page || "1", 10);
    const offset = (page - 1) * PAGE_SIZE;
    try {
      const params = [];
      let where = "WHERE status='APPROVED'";
      if (q) {
        where += " AND title LIKE ?";
        params.push(`%${q}%`);
      }
      const [rows] = await pool.query(
        `SELECT b.id, b.title, b.description, b.cover_url, b.content_type, b.status, u.id as author_id, u.name as author_name
         FROM books b JOIN users u ON u.id=b.author_id
         ${where} ORDER BY b.updated_at DESC LIMIT ? OFFSET ?`,
        [...params, PAGE_SIZE, offset]
      );
      return res.json({ ok: true, data: rows });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ ok: false, message: "Error de servidor" });
    }
  }
);

// My books for current user
router.get("/mine", authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.* FROM books b WHERE b.author_id = ? ORDER BY b.updated_at DESC`,
      [req.user.id]
    );
    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Error de servidor" });
  }
});

// Create/submit book (AUTHOR or BIBLIOTECARIO)
router.post(
  "/",
  authRequired,
  (req, res, next) => {
    if (!["AUTOR","BIBLIOTECARIO","ADMIN"].includes(req.user.role)) {
      return res.status(403).json({ ok:false, message:"No autorizado" });
    }
    next();
  },
  body("title").isString().isLength({ min: 2 }),
  body("description").optional().isString().isLength({ max: 800 }),
  body("cover_url").optional().isString(),
  body("content_type").isIn(["TEXT","PDF","DOCX"]),
  body("content").optional().isString(), // only for TEXT
  body("content_url").optional().isString(), // for PDF/DOCX
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ ok:false, errors: errors.array() });
    const { title, description, cover_url, content_type, content, content_url } = req.body;
    try {
      const [result] = await pool.query(
        "INSERT INTO books (author_id, title, description, cover_url, content_type, content_url, status) VALUES (?,?,?,?,?,?, 'PENDING')",
        [req.user.id, title, description || null, cover_url || null, content_type, content_url || null]
      );
      const bookId = result.insertId;
      if (content_type === "TEXT" && content) {
        // Split into pages by approx N chars (e.g., 1800)
        const N = 1800;
        for (let i = 0, page = 1; i < content.length; i += N, page++) {
          const chunk = content.slice(i, i + N);
          await pool.query("INSERT INTO book_pages (book_id, page_number, text) VALUES (?,?,?)", [bookId, page, chunk]);
        }
      }
      return res.json({ ok: true, id: bookId, status: "PENDING" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ ok:false, message:"Error de servidor" });
    }
  }
);

// Update book -> set status back to PENDING and clear approvals
router.put(
  "/:id",
  authRequired,
  param("id").isInt({ min:1 }),
  body("title").optional().isString().isLength({ min: 2 }),
  body("description").optional().isString().isLength({ max: 800 }),
  body("cover_url").optional().isString(),
  body("content").optional().isString(),
  body("content_type").optional().isIn(["TEXT","PDF","DOCX"]),
  body("content_url").optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ ok:false, errors: errors.array() });
    const id = Number(req.params.id);
    try {
      // Ensure ownership
      const [rows] = await pool.query("SELECT author_id, content_type FROM books WHERE id=?", [id]);
      if (!rows.length) return res.status(404).json({ ok:false, message:"No encontrado" });
      const book = rows[0];
      if (book.author_id !== req.user.id && !["BIBLIOTECARIO"].includes(req.user.role)) {
        return res.status(403).json({ ok:false, message:"No autorizado" });
      }

      const fields = [];
      const vals = [];
      for (const key of ["title","description","cover_url","content_url","content_type"]) {
        if (req.body[key] !== undefined) {
          fields.push(`${key}=?`);
          vals.push(req.body[key]);
        }
      }
      fields.push("status='PENDING'");
      fields.push("approved_by=NULL");
      fields.push("approved_at=NULL");

      await pool.query(`UPDATE books SET ${fields.join(", ")} WHERE id=?`, [...vals, id]);

      if (req.body.content !== undefined) {
        await pool.query("DELETE FROM book_pages WHERE book_id=?", [id]);
        if ((req.body.content_type || book.content_type) === "TEXT" && req.body.content) {
          const N = 1800;
          for (let i=0, page=1; i<req.body.content.length; i+=N, page++) {
            const chunk = req.body.content.slice(i, i+N);
            await pool.query("INSERT INTO book_pages (book_id, page_number, text) VALUES (?,?,?)", [id, page, chunk]);
          }
        }
      }
      return res.json({ ok:true, id, status:"PENDING" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ ok:false, message:"Error de servidor" });
    }
  }
);

// Delete (Author can delete own without approval)
router.delete("/:id", authRequired, param("id").isInt({min:1}), async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [rows] = await pool.query("SELECT author_id FROM books WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ ok:false, message:"No encontrado" });
    const book = rows[0];
    if (book.author_id !== req.user.id ) {
      return res.status(403).json({ ok:false, message:"No autorizado" });
    }
    await pool.query("DELETE FROM books WHERE id=?", [id]);
    return res.json({ ok:true, deleted:id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok:false, message:"Error de servidor" });
  }
});

// Requests for librarian (BIBLIOTECARIO or ADMIN): list pending
router.get("/requests", authRequired, roleRequired("BIBLIOTECARIO"), async (req,res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.title, b.description, u.name as author_name, b.updated_at
       FROM books b JOIN users u ON u.id=b.author_id WHERE b.status='PENDING' ORDER BY b.updated_at ASC`
    );
    return res.json({ ok:true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok:false, message:"Error de servidor" });
  }
});

router.post("/:id/approve", authRequired, roleRequired("BIBLIOTECARIO"), param("id").isInt({min:1}), async (req,res)=>{
  const id = Number(req.params.id);
  try {
    const [rows] = await pool.query("SELECT id FROM books WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ ok:false, message:"No encontrado" });
    await pool.query("UPDATE books SET status='APPROVED', approved_by=?, approved_at=NOW() WHERE id=?", [req.user.id, id]);
    return res.json({ ok:true, id, status:"APPROVED" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok:false, message:"Error de servidor" });
  }
});

router.post("/:id/reject", authRequired, roleRequired("BIBLIOTECARIO"), param("id").isInt({min:1}), async (req,res)=>{
  const id = Number(req.params.id);
  try {
    const [rows] = await pool.query("SELECT id FROM books WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ ok:false, message:"No encontrado" });
    await pool.query("UPDATE books SET status='REJECTED', approved_by=NULL, approved_at=NULL WHERE id=?", [id]);
    return res.json({ ok:true, id, status:"REJECTED" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok:false, message:"Error de servidor" });
  }
});

// Get one (with pages if TEXT) + author
router.get("/:id", param("id").isInt({min:1}), async (req,res)=>{
  const id = Number(req.params.id);
  try {
    const [[book]] = await pool.query(
      `SELECT b.*, u.name as author_name, u.id as author_id
       FROM books b JOIN users u ON u.id=b.author_id WHERE b.id=?`, [id]);
    if (!book) return res.status(404).json({ ok:false, message:"No encontrado" });
    let pages = [];
    if (book.content_type === "TEXT") {
      const [rows] = await pool.query("SELECT page_number, text FROM book_pages WHERE book_id=? ORDER BY page_number ASC", [id]);
      pages = rows;
    }
    return res.json({ ok:true, data: { book, pages } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok:false, message:"Error de servidor" });
  }
});

export default router;