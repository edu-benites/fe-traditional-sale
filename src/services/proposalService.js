import { getActivePartnerCnpj, getActivePartnerName } from "./partnerBranding";

const LOCAL_STORAGE_KEY_PREFIX = "@Mag:proposal_";
const CURRENT_PROPOSAL_KEY = "@Mag:currentProposalId";

async function bffRequest(path, options = {}) {
  const response = await fetch(`/bff/proposals${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(`Falha no BFF de propostas (${response.status})`);
  return response.status === 204 ? null : response.json();
}

function saveLocal(proposal) {
  localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + proposal.id, JSON.stringify(proposal));
  localStorage.setItem(CURRENT_PROPOSAL_KEY, proposal.id);
}

function localProposal(id) {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + id) || "null");
  } catch {
    return null;
  }
}

export async function createProposal(data) {
  const payload = {
    status: "pendente", current_step: 1, start_date: new Date().toISOString(),
    product_id: String(data.productId || ""), offer_code: String(data.offerCode || ""),
    product_name: data.productName || "", offer_name: data.offerName || "",
    quantity: Number(data.quantity) || 1, unit_value: Number(data.unitValue) || 0,
    total_value: Number(data.totalValue) || 0, month_term: Number(data.monthTerm) || 0,
    rescue_value: Number(data.rescueValue) || 0, partner_cnpj: data.partnerCnpj || getActivePartnerCnpj(),
    partner_name: data.partnerName || getActivePartnerName(), client_type: "fisica",
    document_number: "", form_data: {}, payment_data: { banco: "341 - Itau", agencia: "", digitoAgencia: "", contaCorrente: "" },
    token_method: "sms", token_code: "", proposal_number: "",
  };
  try {
    const result = await bffRequest("", { method: "POST", body: JSON.stringify(payload) });
    const proposal = Array.isArray(result) ? result[0] : result;
    saveLocal(proposal);
    return proposal;
  } catch (error) {
    console.warn("[proposalService] BFF indisponível, usando armazenamento local:", error);
    const proposal = { ...payload, id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    saveLocal(proposal);
    return proposal;
  }
}

export async function getProposalById(id) {
  if (!id) return null;
  if (!id.startsWith("local-")) {
    try {
      const result = await bffRequest(`/${encodeURIComponent(id)}`);
      const proposal = Array.isArray(result) ? result[0] : result;
      if (proposal) { saveLocal(proposal); return proposal; }
    } catch (error) { console.warn("[proposalService] Erro ao buscar proposta:", error); }
  }
  return localProposal(id);
}

export async function updateProposal(id, updates) {
  if (!id) return null;
  const payload = { ...updates, updated_at: new Date().toISOString() };
  let updatedData = null;
  if (!id.startsWith("local-")) {
    try {
      const result = await bffRequest(`/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
      updatedData = Array.isArray(result) ? result[0] : result;
    } catch (error) { console.warn("[proposalService] Erro ao atualizar proposta:", error); }
  }
  const localData = { ...(localProposal(id) || {}), ...payload, ...(updatedData || {}) };
  saveLocal(localData);
  return updatedData || localData;
}

export async function completeProposal(id, { proposalNumber, tokenCode, tokenMethod }) {
  return updateProposal(id, { status: "completo", finish_date: new Date().toISOString(), current_step: 6, proposal_number: proposalNumber, token_code: tokenCode || "", token_method: tokenMethod || "sms" });
}

export async function getAllProposals() {
  try {
    const result = await bffRequest(`?partner_cnpj=${encodeURIComponent(getActivePartnerCnpj())}`);
    return result || [];
  } catch (error) {
    console.warn("[proposalService] Erro ao listar propostas:", error);
    const proposals = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
        const item = localProposal(key.slice(LOCAL_STORAGE_KEY_PREFIX.length));
        if (item) proposals.push(item);
      }
    }
    return proposals.sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0));
  }
}
