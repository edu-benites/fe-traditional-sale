import { api } from "./api";

export async function getProposalDetails(proposalNumber, partnerCnpj) {
  try {
    const response = await api.get("/api/underwriting-cap/v1/proposals/partner", {
      params: { proposalNumber },
      headers: { CNPJ: partnerCnpj },
    });

    return response.data;
  } catch (error) {
    console.error("getProposalDetails failed:", error);
    throw error;
  }
}
