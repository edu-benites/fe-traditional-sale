function getBaseUrl(name, fallback) {
  return (import.meta.env[name] || fallback).replace(/\/+$/, "");
}

export const API_BASE_URL = getBaseUrl(
  "VITE_API_BASE_URL",
  "https://apis-hmg.magcap.com.br"
);

export const AUTH_BASE_URL = getBaseUrl("VITE_AUTH_BASE_URL", API_BASE_URL);

export const OUTSYSTEMS_BASE_URL = getBaseUrl(
  "VITE_OUTSYSTEMS_BASE_URL",
  "https://outsystemshmg.simple2u.com.br/VendaAssistidaCAP_CS"
);

// VITE_* variables are bundled into the browser. Move these credentials to a backend token broker before production.
export const AUTH_CLIENT_ID = import.meta.env.VITE_AUTH_CLIENT_ID || "usr_cap_api_hmg";
export const AUTH_CLIENT_SECRET = import.meta.env.VITE_AUTH_CLIENT_SECRET || "SajIys6TyFZZHGqA";
export const AUTH_SCOPE = import.meta.env.VITE_AUTH_SCOPE || "cap.api";

export function getApiAccessToken() {
  return localStorage.getItem("@Mag:sensedia_token") || import.meta.env.VITE_API_TOKEN || "";
}
