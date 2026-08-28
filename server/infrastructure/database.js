import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export function createDatabase(config) {
  mkdirSync(dirname(config.databasePath), { recursive: true });
  const database = new DatabaseSync(config.databasePath);
  database.exec("CREATE TABLE IF NOT EXISTS proposals (id TEXT PRIMARY KEY, partner_cnpj TEXT, response_json TEXT NOT NULL, updated_at TEXT NOT NULL)");
  return {
    saveProposal(proposal) {
      database.prepare("INSERT OR REPLACE INTO proposals VALUES (?, ?, ?, ?)").run(proposal.id, proposal.partner_cnpj || "", JSON.stringify(proposal), new Date().toISOString());
    },
    getProposal(id) {
      const row = database.prepare("SELECT response_json FROM proposals WHERE id = ?").get(id);
      return row ? JSON.parse(row.response_json) : null;
    },
    listProposals(partnerCnpj) {
      const rows = partnerCnpj ? database.prepare("SELECT response_json FROM proposals WHERE partner_cnpj = ? ORDER BY updated_at DESC").all(partnerCnpj) : database.prepare("SELECT response_json FROM proposals ORDER BY updated_at DESC").all();
      return rows.map((row) => JSON.parse(row.response_json));
    },
    close() { database.close(); },
  };
}
