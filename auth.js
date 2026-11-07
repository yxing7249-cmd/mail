const SESSION_COOKIE = "__Host-tm_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extraHeaders },
  });
}
function cookie(value, maxAge = SESSION_SECONDS) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
function readCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  const part = raw.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return part ? part.slice(name.length + 1) : "";
}
function b64(bytes) {
  let s = "";
  for (const byte of new Uint8Array(bytes)) s += String.fromCharCode(byte);
  return btoa(s);
}
function fromB64(s) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}
async function hashPassword(password, saltBytes) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: 210000 }, key, 256);
  return b64(bits);
}
async function digest(value) {
  return b64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}
function originAllowed(request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}
function validEmail(email) {
  return typeof email === "string" && email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
async function createSession(request, env, user) {
  const raw = new Uint8Array(32);
  crypto.getRandomValues(raw);
  const token = b64(raw).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  const tokenHash = await digest(token);
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(tokenHash, user.id, expires).run();
  return json({ ok: true, user: { id: user.id, email: user.email } }, 200, {
    "set-cookie": cookie(token),
  });
}
async function currentSession(request, env) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await digest(token);
  const row = await env.DB.prepare(
    "SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?"
  ).bind(tokenHash, Math.floor(Date.now() / 1000)).first();
  return row || null;
}
export { SESSION_COOKIE, SESSION_SECONDS, json, cookie, readCookie, hashPassword, b64, fromB64, digest, originAllowed, validEmail, createSession, currentSession };
