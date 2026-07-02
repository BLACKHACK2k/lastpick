// LastPick — TMDb proxy. Keeps the API key server-side.
// The app calls /api/tmdb?path=/search/movie&query=... and this adds the key.
export default async (req) => {
  const inUrl = new URL(req.url);
  const path = inUrl.searchParams.get("path") || "";
  const key = Netlify.env.get("TMDB_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "TMDB_KEY not set" }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
  const t = new URL("https://api.themoviedb.org/3" + path);
  inUrl.searchParams.forEach((v, k) => { if (k !== "path") t.searchParams.set(k, v); });
  t.searchParams.set("api_key", key);
  const r = await fetch(t.toString(), { headers: { Accept: "application/json" } });
  const body = await r.text();
  return new Response(body, {
    status: r.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" }
  });
};

export const config = { path: "/api/tmdb" };
