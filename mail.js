// Cloudflare Pages Function: same-origin proxy for the 1secmail API.
const UPSTREAM = "https://www.1secmail.com/api/v1/";
const ALLOWED_ACTIONS = new Set(["genRandomMailbox", "getMessages", "readMessage"]);

export async function onRequest({ request }) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  };

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  const incoming = new URL(request.url);
  const action = incoming.searchParams.get("action") || "";
  if (!ALLOWED_ACTIONS.has(action)) {
    return new Response(JSON.stringify({ error: "Unsupported mail action" }), { status: 400, headers });
  }

  const params = new URLSearchParams();
  params.set("action", action);

  if (action === "genRandomMailbox") {
    params.set("count", "1");
  } else {
    const login = incoming.searchParams.get("login") || "";
    const domain = incoming.searchParams.get("domain") || "";
    if (!/^[a-z0-9._-]{1,64}$/i.test(login) ||
        !/^[a-z0-9.-]{1,253}$/i.test(domain) ||
        domain.startsWith(".") || domain.endsWith(".")) {
      return new Response(JSON.stringify({ error: "Invalid mailbox address" }), { status: 400, headers });
    }
    params.set("login", login);
    params.set("domain", domain);

    if (action === "readMessage") {
      const id = incoming.searchParams.get("id") || "";
      if (!/^[a-z0-9_-]{1,100}$/i.test(id)) {
        return new Response(JSON.stringify({ error: "Invalid message id" }), { status: 400, headers });
      }
      params.set("id", id);
    }
  }

  try {
    const upstream = await fetch(UPSTREAM + "?" + params.toString(), {
      headers: { "accept": "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    const body = await upstream.text();
    if (!upstream.ok) {
      return new Response(JSON.stringify({
        error: "Temporary mail provider returned an error",
        upstreamStatus: upstream.status,
      }), { status: 502, headers });
    }
    JSON.parse(body);
    return new Response(body, { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Could not reach the temporary mail provider",
      detail: error?.name === "TimeoutError" ? "upstream timeout" : "upstream unavailable",
    }), { status: 502, headers });
  }
}
