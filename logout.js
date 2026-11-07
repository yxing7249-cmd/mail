import { json, readCookie, digest, cookie, originAllowed } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "账户数据库尚未配置。" }, 503);
  if (!originAllowed(request)) return json({ error: "请求来源无效。" }, 403);
  const token = readCookie(request, "__Host-tm_session");
  if (token) {
    const tokenHash = await digest(token);
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
  }
  return json({ ok: true }, 200, { "set-cookie": cookie("", 0) });
}
