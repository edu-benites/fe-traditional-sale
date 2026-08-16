import { supabase, isSupabaseConfigured } from "./supabase";

const LOCAL_STORAGE_KEY_PREFIX = "@Mag:proposal_";
const CURRENT_PROPOSAL_KEY = "@Mag:currentProposalId";

/**
 * Cria uma nova proposta na tabela form_proposals
 */
export async function createProposal(data) {
  const proposalPayload = {
    status: "pendente",
    current_step: 1,
    start_date: new Date().toISOString(),
    product_id: String(data.productId || ""),
    product_name: data.productName || "",
    offer_name: data.offerName || "",
    quantity: Number(data.quantity) || 1,
    unit_value: Number(data.unitValue) || 0,
    total_value: Number(data.totalValue) || 0,
    month_term: Number(data.monthTerm) || 0,
    rescue_value: Number(data.rescueValue) || 0,
    partner_cnpj: data.partnerCnpj || localStorage.getItem("@Mag:cnpj") || "",
    partner_name: data.partnerName || localStorage.getItem("@Mag:partnerName") || "",
    client_type: "fisica",
    document_number: "",
    form_data: {},
    payment_data: {
      banco: "341 - Itau",
      agencia: "",
      digitoAgencia: "",
      contaCorrente: "",
    },
    token_method: "sms",
    token_code: "",
    proposal_number: "",
  };

  let createdProposal = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: inserted, error } = await supabase
        .from("form_proposals")
        .insert([proposalPayload])
        .select()
        .single();

      if (error) {
        console.error("[proposalService] Erro ao inserir no Supabase:", error);
      } else if (inserted) {
        createdProposal = inserted;
      }
    } catch (err) {
      console.error("[proposalService] Falha na comunicação com Supabase:", err);
    }
  }

  // Fallback ou backup no localStorage
  if (!createdProposal) {
    const localId = "local-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    createdProposal = {
      ...proposalPayload,
      id: localId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Salva no LocalStorage como cache e define como proposta ativa
  localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + createdProposal.id, JSON.stringify(createdProposal));
  localStorage.setItem(CURRENT_PROPOSAL_KEY, createdProposal.id);

  return createdProposal;
}

/**
 * Busca uma proposta por ID (Supabase com fallback para LocalStorage)
 */
export async function getProposalById(id) {
  if (!id) return null;

  if (isSupabaseConfigured && supabase && !id.startsWith("local-")) {
    try {
      const { data, error } = await supabase
        .from("form_proposals")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        // Atualiza cache local
        localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + id, JSON.stringify(data));
        return data;
      }
      if (error) {
        console.warn("[proposalService] Erro ao buscar no Supabase, tentando local:", error);
      }
    } catch (err) {
      console.warn("[proposalService] Erro ao conectar ao Supabase:", err);
    }
  }

  // Busca do LocalStorage
  const localData = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + id);
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch (e) {
      console.error("[proposalService] Erro ao parsear dados locais:", e);
    }
  }

  return null;
}

/**
 * Atualiza campos de uma proposta etapa por etapa
 */
export async function updateProposal(id, updates) {
  if (!id) return null;

  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  let updatedData = null;

  if (isSupabaseConfigured && supabase && !id.startsWith("local-")) {
    try {
      const { data, error } = await supabase
        .from("form_proposals")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        updatedData = data;
      } else if (error) {
        console.error("[proposalService] Erro ao atualizar no Supabase:", error);
      }
    } catch (err) {
      console.error("[proposalService] Falha ao atualizar no Supabase:", err);
    }
  }

  // Atualiza LocalStorage
  const localDataStr = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + id);
  let localData = localDataStr ? JSON.parse(localDataStr) : {};
  localData = { ...localData, ...payload, ...(updatedData || {}) };
  localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + id, JSON.stringify(localData));

  return updatedData || localData;
}

/**
 * Finaliza a proposta, marcando status completo e data de término
 */
export async function completeProposal(id, { proposalNumber, tokenCode, tokenMethod }) {
  const updates = {
    status: "completo",
    finish_date: new Date().toISOString(),
    current_step: 6,
    proposal_number: proposalNumber,
    token_code: tokenCode || "",
    token_method: tokenMethod || "sms",
  };

  return await updateProposal(id, updates);
}

/**
 * Busca todas as propostas do parceiro atual (Supabase + fallback localStorage)
 */
export async function getAllProposals() {
  const partnerCnpj =
    localStorage.getItem("@Mag:cnpj") || "";

  // Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const query = supabase
        .from("form_proposals")
        .select("id, status, start_date, finish_date, current_step, product_name, document_number, proposal_number, partner_cnpj")
        .order("start_date", { ascending: false });

      if (partnerCnpj) {
        query.eq("partner_cnpj", partnerCnpj);
      }

      const { data, error } = await query.limit(100);

      if (!error && data) {
        return data;
      }
      if (error) {
        console.warn("[proposalService] Erro ao listar do Supabase:", error);
      }
    } catch (err) {
      console.warn("[proposalService] Falha ao conectar ao Supabase:", err);
    }
  }

  // Fallback: varre localStorage procurando propostas salvas
  const proposals = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
      try {
        const item = JSON.parse(localStorage.getItem(key));
        if (item && item.id) proposals.push(item);
      } catch (e) {
        // ignora entradas inválidas
      }
    }
  }

  // Ordena por data de criação (mais recentes primeiro)
  proposals.sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0));
  return proposals;
}

