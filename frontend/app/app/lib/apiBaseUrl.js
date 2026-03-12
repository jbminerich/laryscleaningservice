export function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (
      hostname === "laryscleaningservices.org" ||
      hostname === "www.laryscleaningservices.org" ||
      hostname === "app.localhost"
    ) {
      // Use Next.js API route proxy on same origin for consistency.
      return "/api";
    }
  }

  const envValue = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envValue) {
    return envValue.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const { hostname } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }
  }

  return "/api";
}