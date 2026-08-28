export function createMagApiClient(config, getAccessToken) {
  return async function request(target, request, { useMagToken = true } = {}) {
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers || {})) {
      if (value && !["host", "connection", "content-length", "authorization"].includes(name.toLowerCase())) headers.set(name, Array.isArray(value) ? value.join(",") : value);
    }
    if (useMagToken) headers.set("authorization", `Bearer ${await getAccessToken()}`);
    const url = target.startsWith("http") ? target : `${config.magApiBaseUrl}${target}`;
    return fetch(url, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body, signal: AbortSignal.timeout(config.requestTimeoutMs) });
  };
}
