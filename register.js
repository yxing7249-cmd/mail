import { json, hashPassword, b64, createSession, originAllowed, validEmail } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "账户数据库尚未配置，请先完成 Cloudflare D1 设置。" }, 503);
  if (!originAllowed(request)) return json({ error: "请求来源无效。" }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: "请求格式不正确。" }, 400); }
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!validEmail(email)) return json({ error: "请输入有效的邮箱地址。" }, 400);
  if (password.length < 8 || password.length > 128) return json({ error: "密码长度需要为 8–128 个字符。" }, 400);

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return json({ error: "这个邮箱已经注册，请直接登录。" }, 409);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordHash = await hashPassword(password, salt);
  const saltText = b64(salt);
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare("INSERT INTO users (id, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(id, email, passwordHash, saltText, Math.floor(Date.now() / 1000)).run();
  } catch {
    return json({ error: "注册未成功，可能该邮箱已注册，请尝试登录。" }, 409);
  }
  return createSession(request, env, { id, email });
}
