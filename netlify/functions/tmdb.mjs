// LastPick — TMDb proxy. Keeps the API key server-side.
// The app calls /api/tmdb?path=/search/movie&query=... and this adds the key.
// CORS so the packaged native app (Capacitor, origin https://localhost) can call this too.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Accept, Content-Type"
};

export default async (req) => {
  // preflight
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const inUrl = new URL(req.url);
  const path = inUrl.searchParams.get("path") || "";
  const key = Netlify.env.get("TMDB_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "TMDB_KEY not set" }), {
      status: 500, headers: { "Content-Type": "application/json", ...CORS }
    });
  }
  const t = new URL("https://api.themoviedb.org/3" + path);
  inUrl.searchParams.forEach((v, k) => { if (k !== "path") t.searchParams.set(k, v); });
  t.searchParams.set("api_key", key);
  const r = await fetch(t.toString(), { headers: { Accept: "application/json" } });
  const body = await r.text();
  return new Response(body, {
    status: r.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300", ...CORS }
  });
};

export const config = { path: "/api/tmdb" };
