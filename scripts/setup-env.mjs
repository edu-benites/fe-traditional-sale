import { readFile, writeFile } from "node:fs/promises";

try {
  const [current, example] = await Promise.all([readFile(".env", "utf8"), readFile(".env.example", "utf8")]);
  const currentNames = new Set(current.split(/\r?\n/).map((line) => line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=/)?.[1]).filter(Boolean));
  const missing = example.split(/\r?\n/).filter((line) => {
    const name = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=/)?.[1];
    return name && !currentNames.has(name);
  });
  if (missing.length) {
    await writeFile(".env", `${current.trimEnd()}\n\n# Variáveis adicionadas pelo env:setup\n${missing.join("\n")}\n`);
    console.log(`[env:setup] .env completado com ${missing.length} variável(is); valores existentes foram preservados.`);
  } else {
    console.log("[env:setup] .env já contém todas as variáveis do exemplo.");
  }
} catch {
  const example = await readFile(".env.example", "utf8");
  await writeFile(".env", example);
  console.log("[env:setup] .env criado a partir de .env.example.");
  console.log("[env:setup] Preencha as credenciais OAuth antes de executar npm run dev:all.");
}
