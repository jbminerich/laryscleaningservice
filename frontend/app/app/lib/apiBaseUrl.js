export function getApiBaseUrl() {
  const envValue = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envValue) {
    return envValue.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const { hostname } = window.location;

    if (hostname === "app.localhost") {
      return "http://api.localhost";
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }

    if (hostname === "www.laryscleaningservices.org") {
      return "https://laryscleaningservices.org/api";
    }

    if (hostname === "laryscleaningservices.org") {
      return "https://laryscleaningservices.org/api";
    }
  }

  return "/api";
}