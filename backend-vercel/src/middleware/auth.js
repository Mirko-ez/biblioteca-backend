import jwt from "jsonwebtoken";

export function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, message: "Token requerido" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, message: "Token inválido" });
  }
}

export function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, message: "No autenticado" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, message: "No autorizado" });
    }
    next();
  };
}