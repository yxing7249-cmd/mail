import { json, hashPassword, fromB64, createSession, originAllowed, validEmail } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "账户数据库尚未配置，请先完成 Cloudflare D1 设置。" }, 503);
  if (!originAllowed(request)) return json({ error: "请求来源无效。" }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: "请求格式不正确。" }, 400); }
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!validEmail(email) || password.length < 1 || password.length > 128) {
    return json({ error: "邮箱或密码错误。" }, 401);
  }
  const user = await env.DB.prepare("SELECT id, email, password_hash, password_salt FROM users WHERE email = ?")
    .bind(email).first();
  if (!user) return json({ error: "邮箱或密码错误。" }, 401);

  const candidate = await hashPassword(password, fromB64(user.password_salt));
  if (candidate !== user.password_hash) return json({ error: "邮箱或密码错误。" }, 401);
  return createSession(request, env, user);
}
