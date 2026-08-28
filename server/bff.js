import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { config, validateConfig } from "./config.js";
import { createMagApiClient } from "./infrastructure/magApiClient.js";
import { createTokenClient } from "./infrastructure/tokenClient.js";
import { createDatabase } from "./infrastructure/database.js";

validateConfig();
const root = join(fileURLToPath(new URL("..", import.meta.url)), "dist");
const getAccessToken = createTokenClient(config);
const apiRequest = createMagApiClient(config, getAccessToken);
const database = createDatabase(config);
const allowedMagPath = /^\/api\/(sales-cap|offers-cap|underwriting-cap|documents-cap|benefit-cap|billing-cap|domains-cap)\/v1(?:\/|$)/;

function securityHeaders() {
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'self'",
    "Access-Control-Allow-Origin": config.corsOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, CNPJ, X-CNPJ",
  };
}

function send(response, status, body) {
  response.writeHead(status, { ...securityHeaders(), ...(body ? { "content-type": "application/json; charset=utf-8" } : {}) });
  response.end(body === undefined ? undefined : JSON.stringify(body));
}

async function readBody(request) {
  const length = Number(request.headers["content-length"] || 0);
  if (length > config.maxBodyBytes) throw Object.assign(new Error("Corpo da requisição excede o limite permitido."), { statusCode: 413 });
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > config.maxBodyBytes) throw Object.assign(new Error("Corpo da requisição excede o limite permitido."), { statusCode: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function proposalRequest(request, url, body) {
  const id = url.pathname === "/bff/proposals" ? "" : decodeURIComponent(url.pathname.split("/").pop());
  if (request.method === "POST") {
    const proposal = { ...JSON.parse(body?.toString() || "{}"), id: id || crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    database.saveProposal(proposal);
    return new Response(JSON.stringify(proposal), { status: 201, headers: { "content-type": "application/json" } });
  }
  if (request.method === "PATCH") {
    const current = database.getProposal(id);
    if (!current) return new Response(JSON.stringify({ message: "Proposta não encontrada." }), { status: 404, headers: { "content-type": "application/json" } });
    const proposal = { ...current, ...JSON.parse(body?.toString() || "{}"), id, updated_at: new Date().toISOString() };
    database.saveProposal(proposal);
    return new Response(JSON.stringify(proposal), { status: 200, headers: { "content-type": "application/json" } });
  }
  const proposals = id ? [database.getProposal(id)].filter(Boolean) : database.listProposals(url.searchParams.get("partner_cnpj"));
  return new Response(JSON.stringify(proposals), { status: 200, headers: { "content-type": "application/json" } });
}

async function proxy(request, target, body) {
  const path = new URL(target).pathname;
  if (path.startsWith("/api/") && !allowedMagPath.test(path)) return null;
  return apiRequest(target, { method: request.method, headers: request.headers, body });
}

async function serveStatic(pathname, response) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const file = normalize(join(root, requested));
  if (!file.startsWith(root)) return send(response, 400, { error: "Caminho inválido" });
  try { await stat(file); response.writeHead(200, securityHeaders()); response.end(await readFile(file)); }
  catch { try { response.writeHead(200, { ...securityHeaders(), "content-type": "text/html; charset=utf-8" }); response.end(await readFile(join(root, "index.html"))); } catch { send(response, 404, { error: "Frontend não publicado" }); } }
}

async function handler(request, response) {
  if (request.method === "OPTIONS") return send(response, 204);
  if (request.headers.origin && request.headers.origin !== config.corsOrigin) return send(response, 403, { error: "Origem não permitida" });
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (request.method === "GET" && url.pathname === "/bff/health") return send(response, 200, { status: "ok" });
  if (!["GET", "POST", "PATCH"].includes(request.method)) return send(response, 405, { error: "Método não permitido" });
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await readBody(request);
  let upstream;
  if (url.pathname.startsWith("/bff/mag/")) {
    const path = url.pathname.slice("/bff/mag".length);
    if (!allowedMagPath.test(path)) return send(response, 404, { error: "Rota MAG não permitida" });
    upstream = await proxy(request, `${config.magApiBaseUrl}${path}${url.search}`, body);
  } else if (url.pathname === "/bff/outsystems/products" && request.method === "GET") {
    if (!config.outsystemsBaseUrl) return send(response, 503, { error: "Integração OutSystems não configurada" });
    const cnpj = (url.searchParams.get("CNPJ") || "").replace(/\D/g, "");
    if (cnpj && cnpj.length !== 14) return send(response, 400, { error: "CNPJ inválido" });
    upstream = await proxy(request, `${config.outsystemsBaseUrl}/rest/MAG_Clients/Product?CNPJ=${encodeURIComponent(cnpj)}`, body);
  } else if (url.pathname === "/bff/auth/refresh" && request.method === "POST") {
    await getAccessToken();
    return send(response, 204);
  } else if (url.pathname === "/bff/proposals" || url.pathname.startsWith("/bff/proposals/")) {
    upstream = await proposalRequest(request, url, body);
  } else return serveStatic(url.pathname, response);
  if (!upstream) return send(response, 404, { error: "Rota não permitida" });
  const data = Buffer.from(await upstream.arrayBuffer());
  response.writeHead(upstream.status, { ...securityHeaders(), "content-type": upstream.headers.get("content-type") || "application/json" });
  response.end(data);
}

createServer((request, response) => handler(request, response).catch((error) => {
  console.error("[BFF]", error.message, error.upstreamBody || "");
  send(response, error.statusCode || 502, {
    error: error.statusCode ? error.message : "Falha na integração",
    upstreamStatus: error.upstreamStatus,
    upstream: error.upstreamBody,
  });
})).listen(config.port, config.host, () => console.log(`[BFF] ouvindo em http://${config.host}:${config.port}`));
process.on("SIGTERM", () => database.close());
process.on("SIGINT", () => database.close());
