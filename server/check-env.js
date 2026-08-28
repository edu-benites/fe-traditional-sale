import { config, validateConfig } from "./config.js";

validateConfig();
console.log(`[BFF] Configuração válida. Porta: ${config.port}`);
