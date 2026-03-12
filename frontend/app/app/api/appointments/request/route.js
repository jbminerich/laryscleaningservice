import { NextResponse } from "next/server";

function getBackendBaseUrls() {
  const fromEnv = process.env.API_INTERNAL_BASE_URL;

  const candidates = [
    fromEnv,
    "http://backend:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
  ]
    .filter(Boolean)
    .map((value) => value.replace(/\/$/, ""));

  return [...new Set(candidates)];
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const backends = getBackendBaseUrls();
  let lastError = "";

  for (const baseUrl of backends) {
    try {
      const upstream = await fetch(`${baseUrl}/appointments/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const text = await upstream.text();
      const contentType = upstream.headers.get("content-type") || "application/json";

      return new Response(text, {
        status: upstream.status,
        headers: { "content-type": contentType },
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown upstream error";
    }
  }

  return NextResponse.json(
    {
      detail:
        "Appointment API is currently unreachable from the frontend server. Please try again shortly.",
      upstream_error: lastError || null,
    },
    { status: 502 }
  );
}