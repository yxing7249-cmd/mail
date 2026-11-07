import { json, currentSession } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ user: null, configured: false }, 503);
  const user = await currentSession(request, env);
  return json({ user: user ? { id: user.id, email: user.email } : null });
}
