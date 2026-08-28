import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import net from "node:net";

const node = process.execPath;
const vite = "node_modules/vite/bin/vite.js";

function freePort(start) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (error) => error.code === "EADDRINUSE" ? resolve(freePort(start + 1)) : reject(error));
    server.listen(start, "127.0.0.1", () => server.close(() => resolve(start)));
  });
}

const bffPort = await freePort(Number(process.env.BFF_PORT || 3000));
const frontendPort = await freePort(Number(process.env.FRONTEND_PORT || 5173));
const childEnv = { ...process.env, BFF_PORT: String(bffPort), FRONTEND_PORT: String(frontendPort), BFF_CORS_ORIGIN: `http://localhost:${frontendPort}` };
const check = spawn(node, ["server/check-env.js"], { stdio: "inherit", env: childEnv });

check.on("exit", (code) => {
  if (code !== 0) {
    console.error("[dev:all] BFF não iniciado: corrija o .env e execute novamente.");
    process.exitCode = code || 1;
    return;
  }
  start();
});

let processes = [];
function start() {
  processes = [
    spawn(node, ["server/bff.js"], { stdio: "inherit", env: childEnv }),
    spawn(node, [vite], { stdio: "inherit", env: childEnv }),
  ];

  console.log(`[dev:all] BFF: http://127.0.0.1:${bffPort}`);
  console.log(`[dev:all] Frontend: http://localhost:${frontendPort}`);
  processes.forEach((child, index) => child.on("exit", (code) => {
    if (!stopping && code && code !== 0) { process.exitCode = code; stop(); }
  }));
}

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  processes.forEach((child) => {
    if (process.platform === "win32") execFile("taskkill", ["/pid", String(child.pid), "/t", "/f"]);
    else child.kill();
  });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
