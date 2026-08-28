import { loadEnvFile } from "node:process";

try { loadEnvFile(".env"); } catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const PLACEHOLDER_VALUES = ["defina-", "seu-projeto", "sua-anon", "sua-chave"];

function value(name, { required = true } = {}) {
  const result = String(process.env[name] || "").trim();
  if (required && (!result || PLACEHOLDER_VALUES.some((placeholder) => result.includes(placeholder)))) {
    throw new Error(`Configure ${name} no arquivo .env antes de iniciar o BFF.`);
  }
  return PLACEHOLDER_VALUES.some((placeholder) => result.includes(placeholder)) ? "" : result;
}

function host(name, fallback = "") {
  const result = value(name, { required: !fallback }) || fallback;
  try {
    new URL(result);
  } catch {
    throw new Error(`${name} precisa ser uma URL válida, por exemplo https://api.exemplo.com`);
  }
  return result.replace(/\/+$/, "");
}

function optionalHost(name) {
  if (!process.env[name]?.trim()) return "";
  return host(name);
}

const apiToken = value("MAG_API_ACCESS_TOKEN", { required: false });
const authClientId = value("MAG_API_CLIENT_ID", { required: false }) || value("MAG_AUTH_CLIENT_ID", { required: false });
const authClientSecret = value("MAG_API_CLIENT_SECRET", { required: false }) || value("MAG_AUTH_CLIENT_SECRET", { required: false });

export const config = {
  host: process.env.BFF_HOST || "127.0.0.1",
  port: Number(process.env.BFF_PORT || process.env.PORT || 3000),
  magApiBaseUrl: host("MAG_API_HOST", process.env.MAG_API_BASE_URL || "https://apis-hmg.magcap.com.br"),
  magAuthBaseUrl: host("MAG_API_HOST", process.env.MAG_AUTH_BASE_URL || process.env.MAG_API_BASE_URL || "https://apis-hmg.magcap.com.br"),
  magAuthTokenUrl: host("MAG_API_TOKEN_URL", process.env.MAG_AUTH_TOKEN_URL || `${process.env.MAG_API_HOST || process.env.MAG_API_BASE_URL || "https://apis-hmg.magcap.com.br"}/connect/token`),
  outsystemsBaseUrl: optionalHost("OUTSYSTEMS_BASE_URL"),
  magApiToken: apiToken,
  magAuthClientId: authClientId,
  magAuthClientSecret: authClientSecret,
  magAuthScope: value("MAG_API_SCOPE", { required: false }) || value("MAG_AUTH_SCOPE", { required: false }) || "cap.api",
  databasePath: process.env.BFF_DATABASE_PATH?.trim() || "./data/traditional-sale.sqlite",
  corsOrigin: process.env.BFF_CORS_ORIGIN || "http://localhost:5173",
  requestTimeoutMs: Number(process.env.BFF_REQUEST_TIMEOUT_MS || 30000),
  maxBodyBytes: Number(process.env.BFF_MAX_BODY_BYTES || 2 * 1024 * 1024),
};

export function validateConfig() {
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error("BFF_PORT precisa ser uma porta válida.");
  if (!Number.isFinite(config.requestTimeoutMs) || config.requestTimeoutMs < 1000) throw new Error("BFF_REQUEST_TIMEOUT_MS precisa ser válido.");
  if (!Number.isFinite(config.maxBodyBytes) || config.maxBodyBytes < 1024) throw new Error("BFF_MAX_BODY_BYTES precisa ser válido.");
  try { new URL(config.corsOrigin); } catch { throw new Error("BFF_CORS_ORIGIN precisa ser uma URL válida."); }
  if (!config.magApiToken && (!config.magAuthClientId || !config.magAuthClientSecret)) throw new Error("Configure MAG_AUTH_CLIENT_ID e MAG_AUTH_CLIENT_SECRET no arquivo .env.");
  if (!config.magApiToken) {
    console.log("[BFF] Autenticação: OAuth client credentials");
  } else {
    console.log("[BFF] Autenticação: token estático (temporário)");
  }
  console.log(`[BFF] Persistência: SQLite local (${config.databasePath})`);
}
