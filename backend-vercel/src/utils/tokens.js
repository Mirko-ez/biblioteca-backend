import crypto from "crypto";
import pool from "../db.js";

export function sha256(str){
  return crypto.createHash('sha256').update(str).digest('hex');
}

export function generateRandomToken(bytes = 48){
  return crypto.randomBytes(bytes).toString('hex'); // 96 hex chars
}

export async function createRefreshToken(user_id, days=7){
  const token = generateRandomToken(48);
  const hash = sha256(token);
  const expires = new Date(Date.now() + days*24*60*60*1000);
  await pool.query("INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?,?,?)", [user_id, hash, expires]);
  return { token, expires_at: expires.toISOString() };
}

export async function verifyRefreshToken(user_id, token){
  const hash = sha256(token);
  const [rows] = await pool.query("SELECT id, expires_at FROM refresh_tokens WHERE user_id=? AND token_hash=?", [user_id, hash]);
  if(!rows.length) return null;
  const row = rows[0];
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await pool.query("DELETE FROM refresh_tokens WHERE id=?", [row.id]);
    return null;
  }
  return row;
}

export async function rotateRefreshToken(user_id, oldTokenId){
  const token = generateRandomToken(48);
  const hash = sha256(token);
  const expires = new Date(Date.now() + 7*24*60*60*1000);
  await pool.query("UPDATE refresh_tokens SET token_hash=?, expires_at=? WHERE id=?", [hash, expires, oldTokenId]);
  return { token, expires_at: expires.toISOString() };
}

export async function revokeRefreshToken(user_id, token){
  const hash = sha256(token);
  await pool.query("DELETE FROM refresh_tokens WHERE user_id=? AND token_hash=?", [user_id, hash]);
}