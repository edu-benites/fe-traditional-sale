export function createTokenClient(config) {
  let accessToken = config.magApiToken;
  let expiresAt = config.magApiToken ? Infinity : 0;
  let pending;

  return async function getAccessToken() {
    if (accessToken && Date.now() < expiresAt) return accessToken;
    if (pending) return pending;
    pending = (async () => {
      const response = await fetch(config.magAuthTokenUrl, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: config.magAuthClientId, client_secret: config.magAuthClientSecret, scope: config.magAuthScope, grant_type: "client_credentials" }),
        signal: AbortSignal.timeout(config.requestTimeoutMs),
      });
      const rawBody = await response.text();
      let data;
      try { data = JSON.parse(rawBody); } catch { data = { raw: rawBody }; }
      if (!response.ok || !data.access_token) {
        const error = new Error(data.error_description || data.error || `Falha na autenticação da API upstream (${response.status}).`);
        error.statusCode = 502;
        error.upstreamStatus = response.status;
        error.upstreamBody = data;
        throw error;
      }
      accessToken = data.access_token;
      expiresAt = Date.now() + Math.max(30, Number(data.expires_in || 300) - 30) * 1000;
      return accessToken;
    })();
    try { return await pending; } finally { pending = null; }
  };
}
