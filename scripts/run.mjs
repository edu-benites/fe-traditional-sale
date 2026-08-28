const [, , command, target] = process.argv;
if ((command === "dev" && target === "all") || (command === "all" && !target)) {
  const { spawn } = await import("node:child_process");
  const { execFile } = await import("node:child_process");
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npm, ["run", "dev:all"], { stdio: "inherit", shell: true });
  const stop = () => process.platform === "win32" ? execFile("taskkill", ["/pid", String(child.pid), "/t", "/f"]) : child.kill();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  child.on("exit", (code) => { process.exitCode = code || 0; });
} else {
  console.error("Uso: npm run dev all");
  process.exitCode = 1;
}
