// src/services/signatureService.js
import { api } from "./api";
import { getActivePartnerCnpj } from "./partnerBranding";

/**
 * Utilitário para limpar formatação e manter apenas dígitos
 */
export const cleanDigits = (value) => String(value || "").replace(/\D/g, "");

/**
 * Formata telefone para objeto com ddd, número e número completo
 */
export const parsePhone = (phoneStr) => {
  const digits = cleanDigits(phoneStr);
  if (!digits) {
    return {
      type: "Celular",
      main: false,
      countryCode: "+55",
      nationalDestinationCode: "",
      number: "",
      NumberFull: "",
    };
  }

  const ddd = digits.length >= 10 ? digits.substring(0, 2) : "";
  const number = digits.length >= 10 ? digits.substring(2) : digits;

  return {
    type: "Celular",
    main: false,
    countryCode: "+55",
    nationalDestinationCode: ddd,
    number: number,
    NumberFull: digits,
  };
};

/**
 * Constrói o objeto JSON unificado que alimenta as 3 requisições da MAG:
 * 1. Geração de Token
 * 2. Confirmação de Token
 * 3. Envio da Proposta
 */
export function buildProposalPayload({
  proposalData = {},
  clientType = "fisica",
  documentNumber = "",
  formData = {},
  paymentData = {},
  tokenMethod = "sms",
  tokenCode = "",
  proposalNumber = "",
  currentStep = 1,
  steps = [],
  signatureId = "",
}) {
  const cnpj =
    getActivePartnerCnpj() ||
    api.defaults.headers.common["cnpj"] ||
    "33608308000173";

  const rawDoc = cleanDigits(documentNumber);
  const isPj = clientType === "juridica";

  const quantity = Number(proposalData?.quantity) || 1;
  const unitContribution =
    Number(proposalData?.unit_value) ||
    (Number(proposalData?.total_value) / quantity) ||
    100;
  const totalContribution =
    Number(proposalData?.total_value) ||
    unitContribution * quantity;

  const clientName = isPj
    ? formData.razaoSocial || formData.nomeFantasia || ""
    : formData.nomeCompleto || "";

  const clientEmail = isPj
    ? formData.representanteEmail || formData.email || ""
    : formData.email || "";

  // Documentos de identificação
  const identificationDocuments = [
    {
      number: rawDoc,
      type: isPj ? "CNPJ" : "CPF",
      extraData: "",
      dateOfIssue: "1900-01-01",
      country: "",
    },
  ];

  if (formData.rg && !formData.naoInformarRg) {
    identificationDocuments.push({
      number: cleanDigits(formData.rg) || formData.rg,
      type: "RG",
      extraData: formData.orgaoExpedidor || "SSP",
      dateOfIssue: formData.dataExpedicao
        ? formData.dataExpedicao.includes("T")
          ? formData.dataExpedicao.split("T")[0]
          : formData.dataExpedicao
        : "2004-01-01",
      country: "",
    });
  }

  // Banco e Agência
  const bankRaw = paymentData.banco || "341 - Itau";
  const bankParts = bankRaw.split(" - ");
  const bankNumber = bankParts[0] ? bankParts[0].trim() : "341";
  const bankName = bankRaw;

  // Telefones
  const phone1 = parsePhone(formData.celular1);
  phone1.main = true;
  const phone2 = parsePhone(formData.celular2);
  const phone3 = parsePhone(formData.celular3);

  // Nome da etapa atual
  const currentStepObj = Array.isArray(steps)
    ? steps.find((s) => s.number === currentStep)
    : null;
  const stepTitle = currentStepObj ? currentStepObj.title : "Identificação do Cliente";

  // Corretor
  const brokerExternalId =
    localStorage.getItem("@Mag:brokerExternalId") || "02309070000232";
  const brokerProducerId = localStorage.getItem("@Mag:brokerProducerId") || "";
  const brokerSusep = localStorage.getItem("@Mag:brokerSusep") || "";

  const nowIso = new Date().toISOString();

  return {
    eventDate: nowIso,
    generalInfo: {
      leadId: "",
      number: proposalNumber || "",
      status: proposalData?.status || "",
      receivedDate: "1900-01-01T00:00:00",
      issuedDate: "1900-01-01T00:00:00",
      totalContribution: totalContribution,
      offerCode: proposalData?.offer_code || proposalData?.offerCode || proposalData?.offer_name || "CAPAD",
      distributionChannel: "Loja Online Capitalização",
      media: "",
      partnerVendorId: cleanDigits(cnpj),
      selfPolicyHolderDocumentId: rawDoc,
      selfPolicyHolderName: clientName,
      isPersonDetails: !isPj,
      PhoneLead: "",
      PhoneDDLead: "",
      isMAGSell: false,
      offerName: proposalData?.offer_name || "Oferta",
      offerId: proposalData?.offer_id || proposalData?.product_id || "a2c46bc9-0892-4c9a-b616-be27398ad7ee",
      From: "",
    },
    policyHolders: [
      {
        typePerson: isPj ? "PJ" : "PF",
        insuredRelation: "titular",
        allowsDigitalRelationship: true,
        personDetails: {
          name: formData.nomeCompleto || "",
          IsSocialName: Boolean(formData.isNomeSocial),
          socialName: formData.isNomeSocial
            ? formData.nomeSocial || formData.nomeCompleto || ""
            : formData.nomeCompleto || "",
          pronoun:
            formData.pronomePreferencia ||
            (formData.sexo === "Feminino" ? "Ela" : "Ele"),
          birthday: formData.dataNascimento
            ? formData.dataNascimento.includes("T")
              ? formData.dataNascimento.split("T")[0]
              : formData.dataNascimento
            : "1966-01-10",
          sex: formData.sexo || "Feminino",
          document: rawDoc,
          position: formData.profissao || "6220-20",
          educationLevel: "",
          civilStatus: formData.estadoCivil || "Solteiro",
          nacionality: formData.nacionalidade || "Brasileira(o)",
          numberOfChildren: 0,
          monthlyIncome:
            Number(cleanDigits(formData.faixaRenda)) || 1500,
          politicallyExposedPerson: formData.isPpe === "sim",
          occupation: {
            brazilianOccupationCode: "6220-20",
            description: formData.profissao || "Abanador na agricultura",
            category: "público",
            company: "",
            position: formData.profissao || "Abanador na agricultura",
          },
          isUniqueDocument: false,
          identificationDocuments: identificationDocuments,
        },
        legalPerson: {
          cnpj: isPj ? rawDoc : "",
          legalName: isPj ? formData.razaoSocial || "" : "",
          commercialName: isPj ? formData.nomeFantasia || "" : "",
          businessActivity: isPj ? formData.ramoAtividade || "" : "",
          StateFree: false,
          stateRegistration: "",
          MunicipalFree: false,
          municipalInscription: "",
          openingDate: "1900-01-01T00:00:00",
          monthlyBillingValue: isPj
            ? Number(cleanDigits(formData.faturamentoMensal)) || 0
            : 0,
          nameContact: isPj ? formData.representanteNome || "" : "",
          countryOrigin: "",
          shareHolders: [],
        },
        emails: [
          {
            type: "Pessoal",
            main: true,
            email: clientEmail,
          },
        ],
        addresses: [
          {
            type: "Residencial",
            street: formData.endereco || "",
            number: formData.numero || "",
            complement: formData.complemento || "",
            district: formData.bairro || "",
            city: formData.cidade || "",
            state: formData.uf || "",
            postalCode: cleanDigits(formData.cep) || "",
            country: "Brasil",
            main: true,
          },
        ],
        telephones: [phone1, phone2, phone3],
      },
    ],
    products: [
      {
        productId: String(proposalData?.product_id || ""),
        productName: proposalData?.product_name || "PM0012T",
        productType: "TRADICIONAL",
        policyHolderRelated: "Titular",
        totalContribution: totalContribution,
        commissionPercentage: 0,
        costingType: "PM",
        coverages: [
          {
            coverageId: "9",
            coverageName: "CAPITALIZACAO",
            coverageType: "Capitalizacao",
            term: Number(proposalData?.month_term) || 12,
            qtyContracts: quantity,
            contracts: [
              {
                quantity,
                contributionValue: unitContribution,
                lotteryNumber: [],
                titleNumber: 0,
                titleKey: "",
                value: 0,
                serieNumber: "",
              },
            ],
          },
        ],
        productExternalId: 0,
      },
    ],
    payment: {
      frequency: "Mensal",
      contributionValue: totalContribution,
      firstPayment: {
        type: "Debito",
        dueDay: 14,
        paymentDetails: {
          accountType: "corrente",
          bankNumber: bankNumber,
          bank: bankName,
          agencyNumber: paymentData.agencia || "6651",
          agencyDigit: paymentData.digitoAgencia || "",
          AgencyFull: `${paymentData.agencia || "6651"}${paymentData.digitoAgencia || ""}`,
          accountNumber: paymentData.contaCorrente || "61093",
          accountDigit: "0",
          AccountFull: `${paymentData.contaCorrente || "61093"}0`,
          digitalPaymentKey: "",
        },
      },
      recurrentPaymentType: {
        type: "Debito",
        dueDay: 14,
        paymentDetails: {
          accountType: "corrente",
          bankNumber: bankNumber,
          bank: bankName,
          agencyNumber: paymentData.agencia || "6651",
          agencyDigit: paymentData.digitoAgencia || "",
          AgencyFull: `${paymentData.agencia || "6651"}${paymentData.digitoAgencia || ""}`,
          accountNumber: paymentData.contaCorrente || "61093",
          accountDigit: "0",
          AccountFull: `${paymentData.contaCorrente || "61093"}0`,
          digitalPaymentKey: "",
        },
      },
    },
    signature: {
      type: "digital",
      signatureDate: nowIso,
      token: tokenCode || "4147",
      numberOfAttempts: 1,
      firstAttemptDate: "1900-01-01T00:00:00",
      lastAttemptDate: nowIso,
      tokenConfirmedBy: tokenMethod === "email" ? "EMAIL" : "SMS",
      tokenConfirmedUsing:
        tokenMethod === "email"
          ? clientEmail
          : cleanDigits(formData.celular1) || "61984757440",
      signatureId:
        signatureId ||
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "be4a0edf-07a3-4ebd-a936-8fcd2423da7b"),
    },
    commercialDetails: {
      vendors: [
        {
          name: "",
          brokerDocument: brokerProducerId,
          susepId: brokerSusep,
          insurerId: "",
          externalId: brokerExternalId,
          commissionPercent: 0,
          mainVendor: true,
          producerId: brokerProducerId,
          validated: false,
        },
      ],
      marketingCampaignCode: "",
      commercialUnitCode: "MTZ",
    },
    saleDetails: {
      saleCode: proposalData?.id || "00021-2251-524212",
      saleStep: stepTitle,
      sourceIp: "",
      sourceUrl: "",
      sourceDevice: "",
      sourceBrowser: "",
      geographicLocation: "",
    },
    messages: [],
    status: proposalData?.status || "",
    error: "",
  };
}

/**
 * Solicita a geração do token de assinatura por SMS ou E-mail utilizando o payload unificado
 */
export async function generateSignatureToken(params) {
  const cnpj =
    params.partnerCnpj ||
    getActivePartnerCnpj() ||
    api.defaults.headers.common["cnpj"] ||
    "33608308000173";

  // Garante que o header CNPJ esteja configurado
  api.defaults.headers.common["cnpj"] = cnpj;

  const payload = buildProposalPayload(params);

  const response = await api.post(
    "/api/sales-cap/v1/signature/generate",
    payload,
    {
      headers: {
        cnpj: cnpj,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

/**
 * Confirma o token de assinatura digitado pelo usuário (/api/sales-cap/v1/signature/confirm)
 */
export async function confirmSignatureToken(params) {
  const cnpj =
    params.partnerCnpj ||
    getActivePartnerCnpj() ||
    api.defaults.headers.common["cnpj"] ||
    "33608308000173";

  api.defaults.headers.common["cnpj"] = cnpj;

  const payload = buildProposalPayload(params);

  const response = await api.post(
    "/api/sales-cap/v1/signature/confirm",
    payload,
    {
      headers: {
        cnpj: cnpj,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

/**
 * Envia e gera a proposta final (/api/underwriting-cap/v1/proposal)
 */
export async function createUnderwritingProposal(params) {
  const cnpj =
    params.partnerCnpj ||
    getActivePartnerCnpj() ||
    api.defaults.headers.common["cnpj"] ||
    "33608308000173";

  api.defaults.headers.common["cnpj"] = cnpj;

  const payload = buildProposalPayload(params);

  const response = await api.post(
    "/api/underwriting-cap/v1/proposal",
    payload,
    {
      headers: {
        cnpj: cnpj,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

/**
 * Extrai o número da proposta a partir da resposta da API
 */
export function extractProposalNumber(response) {
  if (!response) return "";

  return (
    response?.generalInfo?.number ||
    response?.GeneralInfo?.Number ||
    response?.data?.generalInfo?.number ||
    response?.data?.GeneralInfo?.Number ||
    response?.number ||
    response?.Number ||
    ""
  );
}
