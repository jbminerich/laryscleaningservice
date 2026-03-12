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

function getRequestUrls(baseUrl) {
  const urls = [`${baseUrl}/appointments/request`];
  if (!baseUrl.endsWith("/api")) {
    urls.push(`${baseUrl}/api/appointments/request`);
  }
  return urls;
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const backends = getBackendBaseUrls();
  const errors = [];

  for (const baseUrl of backends) {
    for (const requestUrl of getRequestUrls(baseUrl)) {
      try {
        const upstream = await fetch(requestUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
        });

        const text = await upstream.text();
        const contentType = upstream.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          errors.push(
            `${requestUrl}: non-JSON response (status ${upstream.status}) ${
              text ? `- ${text.slice(0, 160)}` : ""
            }`
          );

          if (upstream.status >= 500) {
            continue;
          }

          return NextResponse.json(
            {
              detail:
                text ||
                "Upstream API returned a non-JSON response. This usually indicates a proxy/backend issue.",
              upstream_status: upstream.status,
              upstream_url: requestUrl,
            },
            { status: upstream.status }
          );
        }

        return new Response(text, {
          status: upstream.status,
          headers: { "content-type": "application/json" },
        });
      } catch (error) {
        errors.push(`${requestUrl}: ${error instanceof Error ? error.message : "Unknown upstream error"}`);
      }
    }
  }

  return NextResponse.json(
    {
      detail: "Backend API is unreachable from the frontend container.",
      upstream_error: errors.join(" | ") || null,
    },
    { status: 502 }
  );
}