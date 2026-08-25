import { jsPDF } from "jspdf";
import { api } from "./api";
import {
  getActivePartnerBranding,
  getActivePartnerCnpj,
} from "./partnerBranding";

function formatCurrency(value) {
  return (Number(value) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function cleanDocument(value) {
  return String(value || "").replace(/[^a-zA-Z0-9]/g, "");
}

function getPdfColor() {
  const color = getActivePartnerBranding()?.primaryColour || "#003366";
  const hex = color.replace("#", "");

  return hex.length === 6
    ? [Number.parseInt(hex.slice(0, 2), 16), Number.parseInt(hex.slice(2, 4), 16), Number.parseInt(hex.slice(4, 6), 16)]
    : [0, 51, 102];
}

function createProposalPdf({ proposalNumber, clientType, documentNumber, formData, paymentData, proposalData }) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const primaryColor = getPdfColor();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let cursorY = 22;

  function ensureSpace(height) {
    if (cursorY + height <= pageHeight - 18) return;
    pdf.addPage();
    cursorY = 20;
  }

  function addSection(title, rows) {
    ensureSpace(18);
    pdf.setFillColor(...primaryColor);
    pdf.rect(16, cursorY, pageWidth - 32, 8, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(title, 20, cursorY + 5.4);
    cursorY += 13;

    pdf.setTextColor(31, 41, 55);
    rows.filter(([, value]) => value !== undefined && value !== null && value !== "").forEach(([label, value]) => {
      const text = `${label}: ${value}`;
      const lines = pdf.splitTextToSize(text, pageWidth - 40);
      ensureSpace(lines.length * 5 + 3);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(lines, 20, cursorY);
      cursorY += lines.length * 5 + 3;
    });

    cursorY += 4;
  }

  pdf.setFillColor(...primaryColor);
  pdf.rect(0, 0, pageWidth, 38, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("Proposta de capitalização", 16, 20);
  pdf.setFontSize(10);
  pdf.text(`Número da proposta: ${proposalNumber}`, 16, 29);
  cursorY = 52;

  addSection("Dados da proposta", [
    ["Produto", proposalData?.product_name],
    ["Oferta", proposalData?.offer_name || proposalData?.offer_code],
    ["Quantidade", proposalData?.quantity],
    ["Valor total", formatCurrency(proposalData?.total_value)],
    ["Vigência", proposalData?.month_term ? `${proposalData.month_term} meses` : ""],
  ]);

  addSection(clientType === "juridica" ? "Dados da empresa" : "Dados do cliente", [
    ["Documento", documentNumber],
    ["Nome", clientType === "juridica" ? formData?.razaoSocial : formData?.nomeCompleto],
    ["Nome fantasia", clientType === "juridica" ? formData?.nomeFantasia : ""],
    ["E-mail", clientType === "juridica" ? formData?.representanteEmail : formData?.email],
    ["Telefone", formData?.celular1],
    ["Endereço", [formData?.endereco, formData?.numero, formData?.complemento].filter(Boolean).join(", ")],
    ["Cidade/UF", [formData?.cidade, formData?.uf].filter(Boolean).join(" - ")],
  ]);

  addSection("Forma de pagamento", [
    ["Banco", paymentData?.banco],
    ["Agência", [paymentData?.agencia, paymentData?.digitoAgencia].filter(Boolean).join("-")],
    ["Conta", paymentData?.contaCorrente],
  ]);

  pdf.setTextColor(100, 116, 139);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("Documento gerado eletronicamente pela MAG Capitalização.", 16, pageHeight - 12);

  return pdf.output("blob");
}

export async function uploadProposalToGed(params) {
  const documentNumber = cleanDocument(params.documentNumber);
  if (!params.proposalNumber || !documentNumber) {
    throw new Error("Número da proposta e documento do cliente são obrigatórios para o envio ao GED.");
  }

  const pdfBlob = createProposalPdf(params);
  const filename = `proposta-${params.proposalNumber}.pdf`;
  const formData = new FormData();
  formData.append("tipoProcesso", "Emissao");
  formData.append("tipoDocumento", "PropostaVendida");
  formData.append("idProcesso", String(params.proposalNumber));
  formData.append("documento", documentNumber);
  formData.append("binario", new File([pdfBlob], filename, { type: "application/pdf" }));

  const response = await api.post("/api/documents-cap/v1/documents", formData, {
    headers: {
      cnpj: getActivePartnerCnpj(),
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}
