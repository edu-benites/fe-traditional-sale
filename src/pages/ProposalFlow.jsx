import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { api } from "../services/api";
import PartnerHeader from "../components/PartnerHeader/PartnerHeader";
import { getActivePartnerCnpj } from "../services/partnerBranding";
import { getProposalById, updateProposal, completeProposal } from "../services/proposalService";
import {
  generateSignatureToken,
  confirmSignatureToken,
  createUnderwritingProposal,
  extractProposalNumber,
  buildProposalPayload,
} from "../services/signatureService";
import Modal from "../components/Modal/Modal";
import ConclusionStep from "./proposal-flow/ConclusionStep";
import DevAutoFillButton from "./proposal-flow/DevAutoFillButton";
import IdentificationStep from "./proposal-flow/IdentificationStep";
import PaymentStep from "./proposal-flow/PaymentStep";
import RegistrationStep from "./proposal-flow/RegistrationStep";
import SignatureStep from "./proposal-flow/SignatureStep";
import SummaryStep from "./proposal-flow/SummaryStep";
import {
  getBankValue,
  getMissingRegistrationFields,
  isValidCnpj,
  isValidCpf,
} from "./proposal-flow/validation";
import styles from "./ProposalFlow.module.css";

function apiErrorMessage(body, fallback) {
  if (typeof body === "string" && body.trim()) return body;
  if (Array.isArray(body?.messages) && body.messages.length) return body.messages.join("\n");
  return body?.message || body?.Message || body?.error || body?.Error || body?.detail || body?.Detail || fallback;
}

export default function ProposalFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [proposalId, setProposalId] = useState(
    () => searchParams.get("id") || location.state?.proposalId || localStorage.getItem("@Mag:currentProposalId") || ""
  );
  const [proposalData, setProposalData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [proposalNumber, setProposalNumber] = useState("");
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const advanceStepRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [clientType, setClientType] = useState("fisica");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [isSummaryConfirmed, setIsSummaryConfirmed] = useState(false);
  const numeroInputRef = useRef(null);
  const [isAddressLocked, setIsAddressLocked] = useState(false);
  const [professions, setProfessions] = useState([]);
  const [professionSearch, setProfessionSearch] = useState("");
  const [isLoadingProfessions, setIsLoadingProfessions] = useState(false);
  const [professionsError, setProfessionsError] = useState("");
  const professionsRequestRef = useRef(false);

  const [formData, setFormData] = useState({
    nomeCompleto: "",
    isNomeSocial: false,
    pronomePreferencia: "",
    sexo: "",
    dataNascimento: "",
    rg: "",
    orgaoExpedidor: "",
    dataExpedicao: "",
    naoInformarRg: false,
    estadoCivil: "",
    nacionalidade: "Brasileira(o)",

    email: "",
    celular1: "",
    celular2: "",
    celular3: "",

    cep: "",
    endereco: "",
    bairro: "",
    cidade: "",
    uf: "",
    numero: "",
    complemento: "",

    profissao: "",
    faixaRenda: "",
    isPpe: "nao",

    razaoSocial: "",
    nomeFantasia: "",
    faturamentoMensal: "",
    ramoAtividade: "",
    representanteNome: "",
    representanteEmail: "",
  });

  const [paymentData, setPaymentData] = useState({
    banco: "",
    agencia: "",
    digitoAgencia: "",
    contaCorrente: "",
  });
  const [banks, setBanks] = useState([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [banksError, setBanksError] = useState("");

  const [tokenMethod, setTokenMethod] = useState("");
  const [isTokenSent, setIsTokenSent] = useState(false);
  const [tokenCode, setTokenCode] = useState("");
  const [timer, setTimer] = useState(0);
  const [isSendingToken, setIsSendingToken] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [signatureId, setSignatureId] = useState("");
  const [isConfirmingToken, setIsConfirmingToken] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  // Carrega proposta existente caso o usuário retorne ou recarregue a página
  useEffect(() => {
    const id = searchParams.get("id") || location.state?.proposalId || localStorage.getItem("@Mag:currentProposalId");
    if (id) {
      setProposalId(id);
      loadProposal(id);
    }
  }, [searchParams, location.state]);

  const loadProfessions = async () => {
    if (professions.length || professionsRequestRef.current) return;

    professionsRequestRef.current = true;
    setIsLoadingProfessions(true);
    setProfessionsError("");

    try {
      const cachedProfessions = sessionStorage.getItem("@Mag:professions");
      const responseData = cachedProfessions
        ? JSON.parse(cachedProfessions)
        : (await api.get("/api/domains-cap/v1/professions")).data;
      const data = responseData?.data || responseData;
      const sortedProfessions = (Array.isArray(data) ? data : []).sort((first, second) =>
        (first.description || first.name || "").localeCompare(
          second.description || second.name || "",
          "pt-BR"
        )
      );

      if (!cachedProfessions) {
        sessionStorage.setItem("@Mag:professions", JSON.stringify(sortedProfessions));
      }
      setProfessions(sortedProfessions);
    } catch (error) {
      console.error("Erro ao carregar profissões:", error);
      professionsRequestRef.current = false;
      setProfessionsError("Não foi possível carregar as profissões.");
    } finally {
      setIsLoadingProfessions(false);
    }
  };

  const loadProposal = async (id) => {
    try {
      const data = await getProposalById(id);
      if (data) {
        setProposalData(data);
        if (data.current_step) setCurrentStep(data.current_step);
        if (data.client_type) setClientType(data.client_type);
        if (data.document_number) setDocumentNumber(data.document_number);
        if (data.proposal_number) setProposalNumber(data.proposal_number);
        if (data.token_method) setTokenMethod(data.token_method);
        if (data.token_code) setTokenCode(data.token_code);
        if (data.form_data && Object.keys(data.form_data).length > 0) {
          setFormData((prev) => ({ ...prev, ...data.form_data }));
        }
        if (data.payment_data && Object.keys(data.payment_data).length > 0) {
          setPaymentData((prev) => ({ ...prev, ...data.payment_data }));
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados da proposta:", error);
    }
  };

  useEffect(() => {
    let interval = null;
    if (isTokenSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTokenSent, timer]);

  useEffect(() => {
    if (currentStep === 5 && !isTokenSent) setTokenMethod("");
  }, [currentStep, isTokenSent]);

  useEffect(() => {
    if (currentStep !== 3) return undefined;

    const offerCode = proposalData?.offer_code || proposalData?.offerCode || "";
    const cnpj = getActivePartnerCnpj();

    if (!offerCode || !cnpj) {
      setBanks([]);
      setBanksError("Não foi possível identificar a oferta ou o parceiro para carregar os bancos.");
      return undefined;
    }

    let isCurrent = true;
    setIsLoadingBanks(true);
    setBanksError("");

    const loadBanks = async () => {
      try {
        const response = await api.get(`/api/offers-cap/v1/offer/${offerCode}/banks`, {
          headers: { CNPJ: cnpj },
        });
        const availableBanks = response.data?.data || response.data || [];
        const normalizedBanks = Array.isArray(availableBanks) ? availableBanks : [];

        if (!isCurrent) return;

        setBanks(normalizedBanks);
        setPaymentData((previous) =>
          normalizedBanks.some((bank) => getBankValue(bank) === previous.banco)
            ? previous
            : { ...previous, banco: "" }
        );
      } catch (error) {
        if (!isCurrent) return;
        console.error("Erro ao carregar bancos da oferta:", error);
        setBanks([]);
        setBanksError("Não foi possível carregar os bancos disponíveis para esta oferta.");
      } finally {
        if (isCurrent) setIsLoadingBanks(false);
      }
    };

    loadBanks();
    return () => {
      isCurrent = false;
    };
  }, [currentStep, proposalData]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const formatCurrency = (value) => {
    const num = Number(value) || 0;
    return num.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handleSendToken = async () => {
    if (!tokenMethod || isSendingToken) return;

    setIsSendingToken(true);
    setTokenError("");

    try {
      const response = await generateSignatureToken({
        proposalData,
        clientType,
        documentNumber,
        formData,
        paymentData,
        tokenMethod,
        partnerCnpj: getActivePartnerCnpj(),
      });

      console.log("Token enviado com sucesso via API MAG:", response);

      // Preserva signatureId retornado pela API para usar na confirmação
      const retSigId =
        response?.signature?.signatureId ||
        response?.signatureId ||
        response?.id ||
        "";
      if (retSigId) setSignatureId(retSigId);

      setIsTokenSent(true);
      setTimer(60);

      if (proposalId) {
        await updateProposal(proposalId, { token_method: tokenMethod });
      }
    } catch (error) {
      console.error("Erro ao solicitar envio do token de assinatura:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Não foi possível enviar o token no momento. Verifique as informações e tente novamente.";
      setTokenError(errorMessage);
      alert(`Aviso de envio de token: ${errorMessage}`);
      // Permite prosseguir no fluxo mesmo com fallback
      setIsTokenSent(true);
      setTimer(60);
    } finally {
      setIsSendingToken(false);
    }
  };

  const handleChangeMethod = () => {
    setIsTokenSent(false);
    setTokenCode("");
    setTokenMethod("");
    setTokenError("");
  };

  const steps = [
    { number: 1, title: "Identificação do Cliente" },
    { number: 2, title: "Cadastro" },
    { number: 3, title: "Forma de Pagamento" },
    { number: 4, title: "Resumo da Venda" },
    { number: 5, title: "Assinatura por Token" },
    { number: 6, title: "Conclusão" },
  ];

  // Gera o JSON em tempo real com todos os campos preenchidos
  const currentPayload = buildProposalPayload({
    proposalData,
    clientType,
    documentNumber,
    formData,
    paymentData,
    tokenMethod,
    tokenCode,
    proposalNumber,
    currentStep,
    steps,
  });
  const matchedProfessions = professions
    .filter((profession) =>
      (profession.description || profession.name || "")
        .toLocaleLowerCase("pt-BR")
        .includes(professionSearch.toLocaleLowerCase("pt-BR"))
    )
    .slice(0, 50);
  const incomeLabel = {
    1500: "Até R$ 1.500",
    4000: "Entre R$ 1.501 e R$ 4.000",
    7500: "Entre R$ 4.001 e R$ 7.500",
    mais7500: "A partir de R$ 7.500",
  }[formData.faixaRenda];
  const isTokenCodeValid = /^\d{4}$/.test(tokenCode);
  const mobileGuideStart = Math.min(Math.max(currentStep - 1, 1), steps.length - 2);
  const renderSummaryFields = (fields) =>
    fields
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([label, value]) => (
        <div className={styles.summaryField} key={label}>
          <span className={styles.summaryLabel}>{label}</span>
          <strong className={styles.summaryValue}>{value}</strong>
        </div>
      ));

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(currentPayload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const focusField = (fieldName) => {
    requestAnimationFrame(() => {
      const field = document.querySelector(`[name="${fieldName}"]`);
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.focus();
    });
  };

  const queueProposalGedUpload = (number) => {
    if (!number) return;

    const uploadData = {
      proposalNumber: number,
      proposalData: { ...proposalData },
      clientType,
      documentNumber,
      formData: { ...formData },
      paymentData: { ...paymentData },
    };

    window.setTimeout(() => {
      void import("../services/gedService")
        .then(({ uploadProposalToGed }) => uploadProposalToGed(uploadData))
        .catch((error) => console.error("Erro assíncrono ao enviar proposta ao GED:", error));
    }, 0);
  };

  const handleNext = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);
      const nextStep = Math.min(6, currentStep + 1);

      if (currentStep === 1) {
        const isDocumentValid =
          clientType === "fisica"
            ? isValidCpf(documentNumber)
            : isValidCnpj(documentNumber);

        if (!isDocumentValid) {
          setDocumentError(`Informe um ${clientType === "fisica" ? "CPF" : "CNPJ"} válido.`);
          focusField("documentNumber");
          return;
        }

        setDocumentError("");
        if (proposalId) {
          await updateProposal(proposalId, {
            client_type: clientType,
            document_number: documentNumber,
            current_step: nextStep,
          });
        }
        setCurrentStep(nextStep);
      } else if (currentStep === 2) {
        const missingFields = getMissingRegistrationFields(clientType, formData);

        if (missingFields.length) {
          setRegistrationError(
            `Preencha os campos obrigatórios: ${missingFields.map(({ label }) => label).join(", ")}.`
          );
          focusField(missingFields[0].field);
          return;
        }

        setRegistrationError("");
        if (proposalId) {
          await updateProposal(proposalId, {
            form_data: formData,
            current_step: nextStep,
          });
        }
        setCurrentStep(nextStep);
      } else if (currentStep === 3) {
        if (proposalId) {
          await updateProposal(proposalId, {
            payment_data: paymentData,
            current_step: nextStep,
          });
        }
        setIsSummaryConfirmed(false);
        setCurrentStep(nextStep);
      } else if (currentStep === 4) {
        if (!isSummaryConfirmed) return;

        if (proposalId) {
          await updateProposal(proposalId, {
            current_step: nextStep,
          });
        }
        setCurrentStep(nextStep);
      } else if (currentStep === 5) {
        if (!isTokenCodeValid) return;

        setIsConfirmingToken(true);
        setConfirmError("");

        const commonParams = {
          proposalData,
          clientType,
          documentNumber,
          formData,
          paymentData,
          tokenMethod,
          tokenCode,
          proposalNumber,
          currentStep,
          steps,
          signatureId,
          partnerCnpj: getActivePartnerCnpj(),
        };

        let finalProposalNumber = proposalNumber;

        try {
          // 1. Confirma o token digitado pelo usuário
          const confirmResponse = await confirmSignatureToken(commonParams);
          console.log("Token confirmado:", confirmResponse);

          // 2. Verifica se a API retornou uma indicação de falha no corpo (HTTP 200 com erro semântico)
          const isConfirmFailed =
            confirmResponse?.success === false ||
            confirmResponse?.Success === false ||
            confirmResponse?.status === false ||
            confirmResponse?.Status === false ||
            confirmResponse?.confirmed === false ||
            confirmResponse?.Confirmed === false ||
            (confirmResponse?.error && confirmResponse.error !== "") ||
            (confirmResponse?.Error && confirmResponse.Error !== "") ||
            confirmResponse?.statusCode === 400 ||
            confirmResponse?.statusCode === 401 ||
            confirmResponse?.statusCode === 422 ||
            confirmResponse?.status === "badRequest" ||
            (Array.isArray(confirmResponse?.messages) && confirmResponse.messages.length > 0);

          if (isConfirmFailed) {
            const apiMsg = apiErrorMessage(confirmResponse, "Token inválido ou expirado. Verifique o código e tente novamente.");
            setConfirmError(apiMsg);
            setIsConfirmingToken(false);
            setIsSaving(false);
            return;
          }

          // 3. Se a confirmação retornar um número de proposta, usa ele
          const confirmedNumber = extractProposalNumber(confirmResponse);

          // 4. Verifica condição: GeneralInfo.Number <> "" e <> 0
          const hasValidNumber =
            confirmedNumber !== "" && confirmedNumber !== 0 && confirmedNumber !== "0";

          if (hasValidNumber) {
            finalProposalNumber = confirmedNumber;
          }

          // 5. Chama o endpoint de geração da proposta
          const proposalResponse = await createUnderwritingProposal({
            ...commonParams,
            proposalNumber: finalProposalNumber,
          });
          console.log("Proposta gerada:", proposalResponse);

          // 6. Extrai e define o número final da proposta
          const generatedNumber = extractProposalNumber(proposalResponse);
          if (generatedNumber !== "" && generatedNumber !== 0 && generatedNumber !== "0") {
            finalProposalNumber = generatedNumber;
          }

          setProposalNumber(finalProposalNumber);
        } catch (error) {
          console.error("Erro na confirmação/geração da proposta:", error);
          // Captura mensagem de erro de respostas HTTP 4xx/5xx
          const apiErrorBody = error?.response?.data;
          const errorMsg = apiErrorMessage(apiErrorBody, "Erro ao confirmar token ou gerar proposta. Verifique o código e tente novamente.");
          setConfirmError(errorMsg);
          setIsConfirmingToken(false);
          setIsSaving(false);
          return; // Não avança de etapa em caso de erro
        } finally {
          setIsConfirmingToken(false);
        }


        if (proposalId) {
          await completeProposal(proposalId, {
            proposalNumber: finalProposalNumber,
            tokenCode,
            tokenMethod,
          });
        }
        setCurrentStep(6);
        queueProposalGedUpload(finalProposalNumber);
      }
    } catch (error) {
      console.error("Erro ao salvar etapa:", error);
    } finally {
      setIsSaving(false);
    }
  };

  advanceStepRef.current = handleNext;

  const handleBack = async () => {
    if (currentStep > 1 && currentStep !== 6) {
      const prevStep = currentStep - 1;
      if (currentStep === 4) setIsSummaryConfirmed(false);
      setCurrentStep(prevStep);
      if (proposalId) {
        try {
          await updateProposal(proposalId, { current_step: prevStep });
        } catch (e) {
          console.error("Erro ao atualizar etapa no retorno:", e);
        }
      }
    }
  };

  const handleAutoFillCurrentStep = async () => {
    if (isAutoFilling || currentStep > 4) return;

    setIsAutoFilling(true);

    if (currentStep === 1) {
      setClientType("fisica");
      setDocumentNumber("529.982.247-25");
      setDocumentError("");
    }

    if (currentStep === 2) {
      if (clientType === "juridica") {
        setFormData((previous) => ({
          ...previous,
          nomeFantasia: "Empresa de Teste",
          razaoSocial: "Empresa de Teste LTDA",
          faturamentoMensal: "10000",
          ramoAtividade: "Tecnologia",
          cep: "01310-100",
          endereco: "Avenida Paulista",
          numero: "1000",
          bairro: "Bela Vista",
          cidade: "São Paulo",
          uf: "SP",
          representanteNome: "Contato de Teste",
          representanteEmail: "eduardobenitestetris@gmail.com",
          celular1: "(31) 99948-4639",
        }));
      } else {
        setFormData((previous) => ({
          ...previous,
          nomeCompleto: "Cliente de Teste",
          pronomePreferencia: "Ele/Dele",
          sexo: "Masculino",
          dataNascimento: "1990-01-01",
          rg: "123456789",
          orgaoExpedidor: "SSP",
          dataExpedicao: "2010-01-01",
          estadoCivil: "Solteiro",
          email: "eduardobenitestetris@gmail.com",
          celular1: "(31) 99948-4639",
          cep: "01310-100",
          endereco: "Avenida Paulista",
          numero: "1000",
          bairro: "Bela Vista",
          cidade: "São Paulo",
          uf: "SP",
          profissao: "TESTE",
          faixaRenda: "4000",
        }));
        setProfessionSearch("Profissão de teste");
      }
      setRegistrationError("");
    }

    if (currentStep === 3) {
      setPaymentData((previous) => ({
        ...previous,
        banco: banks[0] ? getBankValue(banks[0]) : "001 - Banco de teste",
        agencia: "1234",
        digitoAgencia: "5",
        contaCorrente: "123456-7",
      }));
    }

    if (currentStep === 4) setIsSummaryConfirmed(true);

    await new Promise((resolve) => setTimeout(resolve, 1200));
    await advanceStepRef.current?.();
    setIsAutoFilling(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRegistrationError("");
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDownloadProposal = () => {
    if (!proposalNumber) return;
    window.open(`/proposal-pdf/${encodeURIComponent(proposalNumber)}`, "_blank");
  };

  const handleNewProposal = () => {
    localStorage.removeItem("@Mag:currentProposalId");
    navigate("/products");
  };

  // Handler para trocar o tipo de cliente e limpar o campo de documento
  const handleClientTypeChange = (e) => {
    setClientType(e.target.value);
    setDocumentNumber(""); // Limpa o valor para evitar máscaras misturadas
  };

  // Handler para formatar celular/telefone fixo no padrão (00) 00000-0000 ou (00) 0000-0000
  const handlePhoneChange = (e) => {
    const { name, value } = e.target;
    setRegistrationError("");

    // 1. Pega o valor e limpa tudo que não é número
    let v = value.replace(/\D/g, "");

    // 2. Trava em 11 dígitos
    v = v.substring(0, 11);

    // 3. Aplica a máscara exata de acordo com a quantidade de números
    if (v.length >= 11) {
      v = v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (v.length >= 7) {
      v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    } else if (v.length >= 3) {
      v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    } else if (v.length > 0) {
      v = v.replace(/^(\d*)/, "($1");
    }

    // 4. Salva no estado
    setFormData((prev) => ({
      ...prev,
      [name]: v,
    }));
  };

  // Handler que aplica as máscaras dinamicamente
  const handleDocumentChange = (e) => {
    let value = e.target.value;
    setDocumentError("");

    if (clientType === "fisica") {
      // Máscara de CPF (000.000.000-00) - Apenas números
      let v = value.replace(/\D/g, ""); // Remove tudo que não for dígito
      if (v.length > 11) v = v.substring(0, 11); // Limita a 11 caracteres puros

      if (v.length > 3) v = v.substring(0, 3) + "." + v.substring(3);
      if (v.length > 7) v = v.substring(0, 7) + "." + v.substring(7);
      if (v.length > 11) v = v.substring(0, 11) + "-" + v.substring(11);

      setDocumentNumber(v);
    } else if (clientType === "juridica") {
      // Máscara de CNPJ Alfanumérico (AA.AAA.AAA/AAAA-99)
      // Remove o que não for letra ou número e força maiúsculo
      let v = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (v.length > 14) v = v.substring(0, 14); // Limita a 14 caracteres puros

      if (v.length > 2) v = v.substring(0, 2) + "." + v.substring(2);
      if (v.length > 6) v = v.substring(0, 6) + "." + v.substring(6);
      if (v.length > 10) v = v.substring(0, 10) + "/" + v.substring(10);
      if (v.length > 15) v = v.substring(0, 15) + "-" + v.substring(15);

      setDocumentNumber(v);
    }
  };

  const handleCepChange = async (e) => {
    let { name, value } = e.target;
    setRegistrationError("");

    // 1. Remove tudo que não for número e limita a 8 dígitos
    value = value.replace(/\D/g, "").substring(0, 8);

    // 2. Aplica a máscara (00000-000)
    let maskedValue = value.replace(/^(\d{5})(\d)/, "$1-$2");

    // 3. Atualiza o estado do CEP
    setFormData((prev) => ({
      ...prev,
      [name]: maskedValue
    }));

    // 4. Se completou os 8 dígitos, dispara a busca na API corporativa
    if (value.length === 8) {
      try {
        const response = await api.get(`/api/sales-cap/v1/postalcode/${value}`);

        const data = response.data;
        if (data) {

          // Preenche os campos com os dados retornados pela API da MAG
          setFormData((prev) => ({
            ...prev,
            endereco: data.logradouro || data.street || "",
            bairro: data.bairro || data.neighborhood || "",
            cidade: data.cidade || data.city || "",
            uf: data.uf || data.state || ""
          }));

          // Trava os campos Bairro, Cidade e UF
          setIsAddressLocked(true);

          // Joga o cursor automaticamente para o input de número
          setTimeout(() => {
            if (numeroInputRef.current) {
              numeroInputRef.current.focus();
            }
          }, 100);

        } else {
          // Se a API retornar erro, destranca para preenchimento manual
          setIsAddressLocked(false);
        }
      } catch (error) {
        console.error("Erro ao buscar o CEP:", error);
        // Em caso de falha de rede/erro, libera os campos sem travar o fluxo
        setIsAddressLocked(false);
      }
    } else if (value.length < 8) {
      // Se o usuário apagar o CEP, destranca os campos
      setIsAddressLocked(false);
    }
  };


  return (
    <>
      <PartnerHeader />
      <div className={styles.pageContainer}>
        <header className={styles.flowIntro}>
          <p className={styles.flowEyebrow}>Venda assistida</p>
          <div className={styles.flowIntroContent}>
            <div>
              <h1>Conclua a proposta</h1>
              <p>Preencha os dados do cliente e avance pelas etapas para formalizar a venda.</p>
            </div>
            <span className={styles.flowStatus}>Etapa {currentStep} de {steps.length}</span>
          </div>
        </header>

        <div className={styles.flowHeader}>
          {proposalData && (proposalData.product_name || proposalData.total_value) && (
            <div className={styles.productSummaryBanner}>
              <button
                type="button"
                onClick={() => navigate("/products")}
                className={styles.devBannerButton}
                title="Voltar aos produtos"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 12H5" />
                  <path d="m12 19-7-7 7-7" />
                </svg>
                Voltar aos produtos
              </button>

              <div className={styles.productSummaryMetrics}>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Quantidade</span>
                  <span className={styles.metricValue}>
                    {proposalData.quantity || 1} {Number(proposalData.quantity || 1) === 1 ? "título" : "títulos"}
                  </span>
                </div>

                <div className={styles.metricDivider}></div>

                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Vigência</span>
                  <span className={styles.metricValue}>
                    {proposalData.month_term ? `${proposalData.month_term} meses` : "-"}
                  </span>
                </div>

                <div className={styles.metricDivider}></div>

                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Valor da Parcela</span>
                  <span className={styles.metricValueHighlight}>
                    {formatCurrency(proposalData.total_value)}
                  </span>
                </div>

                <div className={styles.metricDivider}></div>

                <div className={styles.metricItem}>
                  <span className={styles.productSummaryTag}>Produto selecionado</span>
                  <h2 className={styles.productSummaryName}>{proposalData.product_name || "Produto MAG"}</h2>
                </div>
              </div>
            </div>
          )}

          <section className={styles.guide} aria-label="Etapas da proposta">
            <div className={styles.guideHeading}>
              <span>Jornada da proposta</span>
              <strong>Você está na etapa {currentStep}</strong>
            </div>
            <div className={styles.guideSteps}>
              {steps.map((step) => {
                const isCompleted = step.number < currentStep;
                const isCurrent = step.number === currentStep;

                return (
                  <div
                    className={`${styles.guidePart} ${step.number >= mobileGuideStart && step.number < mobileGuideStart + 3 ? styles.mobileVisible : ""}`}
                    key={step.number}
                  >
                    <div className={`${styles.guideStep} ${isCompleted ? styles.completed : ""} ${isCurrent ? styles.current : ""}`}>
                      <span className={styles.guideIndex}>{isCompleted ? "✓" : step.number}</span>
                      <span className={styles.guideCopy}>
                        <strong>{step.title}</strong>
                      </span>
                    </div>
                    {step.number < steps.length && (
                      <span className={`${styles.guideConnector} ${isCompleted ? styles.completedConnector : ""}`} aria-hidden="true" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Conteúdo Dinâmico por Etapa */}
        <div className={styles.contentCard}>
          {/* ETAPA 1: Identificação do Cliente */}
          {currentStep === 1 && (
            <IdentificationStep
              clientType={clientType}
              documentError={documentError}
              documentNumber={documentNumber}
              onClientTypeChange={(type) => {
                setClientType(type);
                setDocumentNumber("");
                setDocumentError("");
              }}
              onDocumentChange={handleDocumentChange}
            />
          )}

          {/* ETAPA 2: Cadastro */}
          {currentStep === 2 && (
            <RegistrationStep
              clientType={clientType}
              registrationError={registrationError}
            >

              {clientType === "juridica" ? (
                        <>
                  {/* Seção: Dados Empresariais */}
                  <div
                    className={styles.sectionBlock}
                    style={{ borderTop: "none", paddingTop: 0 }}
                  >
                    <h3 className={styles.sectionTitle}>Dados empresariais</h3>

                    <div className={styles.gridRow}>
                      <div className={styles.formGroup}>
                        <label>Nome fantasia *</label>
                        <input
                          type="text"
                          name="nomeFantasia"
                          autoComplete="off"
                          placeholder="Digite o nome fantasia da empresa"
                          value={formData.nomeFantasia}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Razão social *</label>
                        <input
                          type="text"
                          name="razaoSocial"
                          autoComplete="off"
                          placeholder="Digite a Razao social da empresa"
                          value={formData.razaoSocial}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Faturamento mensal *</label>
                        <input
                          type="text"
                          name="faturamentoMensal"
                          autoComplete="off"
                          placeholder="Digite o valor de faturamento mensal"
                          value={formData.faturamentoMensal}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Ramo de atividade *</label>
                        <input
                          type="text"
                          name="ramoAtividade"
                          autoComplete="off"
                          placeholder="Digite o ramo de atividade da empresa"
                          value={formData.ramoAtividade}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção: Endereço */}
                  <div className={styles.sectionBlock}>
                    <h3 className={styles.sectionTitle}>Endereço</h3>

                    <div
                      className={styles.gridRowCEPButton}
                      style={{ marginBottom: "12px" }}
                    >
                      <div className={styles.formGroup}>
                        <label>CEP *</label>
                        <input
                          type="text"
                          name="cep"
                          autoComplete="off"
                          placeholder="Digite o CEP"
                          value={formData.cep}
                          onChange={handleCepChange}
                          className={styles.textInput}
                        />
                      </div>
                      <div
                        className={styles.formGroup}
                        style={{ justifyContent: "flex-end" }}
                      >
                        <button
                          type="button"
                          className={styles.secondaryActionBtn}
                        >
                          Não sei o CEP
                        </button>
                      </div>
                    </div>

                    <div
                      className={styles.gridRow}
                      style={{ marginBottom: "12px" }}
                    >
                      <div className={styles.formGroup}>
                        <label>Endereço *</label>
                        <input
                          type="text"
                          name="endereco"
                          autoComplete="off"
                          placeholder="Digite o endereço"
                          value={formData.endereco}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Número *</label>
                        <input
                          type="text"
                          name="numero"
                          ref={numeroInputRef} // <-- Foco automático jogado para cá
                          autoComplete="off"
                          placeholder="Digite o número"
                          value={formData.numero}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>
                    </div>

                    <div
                      className={styles.gridRow}
                      style={{ marginBottom: "12px" }}
                    >
                      <div className={styles.formGroup}>
                        <label>Complemento</label>
                        <input
                          type="text"
                          name="complemento"
                          autoComplete="off"
                          placeholder="Casa, bloco, apartamento..."
                          value={formData.complemento}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Bairro *</label>
                        <input
                          type="text"
                          name="bairro"
                          autoComplete="off"
                          placeholder={
                            formData.cep ? "Digite o bairro" : "Preencha o CEP"
                          }
                          disabled={!formData.cep || isAddressLocked} // <-- Bloqueia se locked ou vazio
                          value={formData.bairro}
                          onChange={handleInputChange}
                          className={`${styles.textInput} ${isAddressLocked ? styles.disabledInput : ""}`}
                        />
                      </div>
                    </div>

                    <div className={styles.gridRow}>
                      <div className={styles.formGroup}>
                        <label>Cidade *</label>
                        <input
                          type="text"
                          name="cidade"
                          autoComplete="off"
                          placeholder={
                            formData.cep ? "Digite a cidade" : "Preencha o CEP"
                          }
                          disabled={!formData.cep || isAddressLocked} // <-- Bloqueia se locked ou vazio
                          value={formData.cidade}
                          onChange={handleInputChange}
                          className={`${styles.textInput} ${isAddressLocked ? styles.disabledInput : ""}`}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>UF *</label>
                        <input
                          type="text"
                          name="uf"
                          autoComplete="off"
                          placeholder={
                            formData.cep ? "Digite a UF" : "Preencha o CEP"
                          }
                          disabled={!formData.cep || isAddressLocked} // <-- Bloqueia se locked ou vazio
                          value={formData.uf}
                          onChange={handleInputChange}
                          className={`${styles.textInput} ${isAddressLocked ? styles.disabledInput : ""}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção: Contato do Representante */}
                  <div className={styles.sectionBlock}>
                    <h3
                      className={styles.sectionTitle}
                      style={{ marginBottom: "2px" }}
                    >
                      Contato do representante
                    </h3>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "#64748b",
                        margin: "0 0 16px 0",
                      }}
                    >
                      Preencha com as informações da empresa e dos sócios.
                    </p>

                    <div
                      className={styles.gridRow3Equal}
                      style={{ marginBottom: "12px" }}
                    >
                      <div className={styles.formGroup}>
                        <label>Nome *</label>
                        <input
                          type="text"
                          name="representanteNome"
                          autoComplete="off"
                          placeholder="Digite o nome do contato"
                          value={formData.representanteNome}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>E-mail *</label>
                        <input
                          type="email"
                          name="representanteEmail"
                          autoComplete="off"
                          placeholder="Digite o e-mail de contato"
                          value={formData.representanteEmail}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>
                    </div>

                    <div className={styles.gridRow3Equal}>
                      <div className={styles.formGroup}>
                        <label>Celular 1 (Obrigatório) *</label>
                        <input
                          type="text"
                          name="celular1"
                          autoComplete="off"
                          placeholder="(00) 00000-0000"
                          value={formData.celular1}
                          onChange={(e) => {
                            handlePhoneChange(e);
                          }}
                          className={styles.textInput}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Telefone 2 (Opcional)</label>
                        <input
                          type="text"
                          name="celular2"
                          autoComplete="off"
                          placeholder="(00) 00000-0000"
                          value={formData.celular2}
                          onChange={handlePhoneChange}
                          className={styles.textInput}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Telefone 3 (Opcional)</label>
                        <input
                          type="text"
                          name="celular3"
                          autoComplete="off"
                          placeholder="(00) 00000-0000"
                          value={formData.celular3}
                          onChange={handlePhoneChange}
                          className={styles.textInput}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                        <>
                  {/* Seção: Dados Pessoais / Básicos */}
                  <div
                    className={styles.sectionBlock}
                    style={{ borderTop: "none", paddingTop: 0 }}
                  >
                    <h3 className={styles.sectionTitle}>Dados pessoais</h3>

                    <div
                      className={styles.formGroup}
                      style={{ gridColumn: "span 3" }}
                    >
                      <label>Nome completo *</label>
                      <input
                        type="text"
                        name="nomeCompleto"
                        autoComplete="off"
                        data-lpignore="true"
                        placeholder="Digite o nome completo do cliente"
                        value={formData.nomeCompleto}
                        onChange={handleInputChange}
                        className={styles.textInput}
                      />
                    </div>

                    <div className={styles.checkboxLineFull}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          name="isNomeSocial"
                          checked={formData.isNomeSocial}
                          onChange={handleInputChange}
                        />
                        Esse é um nome social ⓘ
                      </label>
                    </div>

                    {/* Linha 1: 3 Colunas */}
                    <div className={styles.gridRow3Equal}>
                      <div className={styles.formGroup}>
                        <label>Pronome de preferência *</label>
                        <select
                          name="pronomePreferencia"
                          value={formData.pronomePreferencia}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        >
                          <option value="">Selecione</option>
                          <option value="Ele/Dele">Ele/Dele</option>
                          <option value="Ela/Dela">Ela/Dela</option>
                          <option value="Elu/Delu">Elu/Delu</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Sexo *</label>
                        <select
                          name="sexo"
                          value={formData.sexo}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        >
                          <option value="">Selecione</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Feminino">Feminino</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Data de nascimento *</label>
                        <input
                          type="date"
                          name="dataNascimento"
                          autoComplete="off"
                          value={formData.dataNascimento}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>
                    </div>

                    {/* Linha 2: 3 Colunas */}
                    <div
                      className={styles.gridRow3Equal}
                      style={{ marginTop: "12px" }}
                    >
                      <div className={styles.formGroup}>
                        <label>RG *</label>
                        <input
                          type="text"
                          name="rg"
                          autoComplete="off"
                          placeholder="Digite o RG"
                          disabled={formData.naoInformarRg}
                          value={formData.rg}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Órgão expedidor *</label>
                        <input
                          type="text"
                          name="orgaoExpedidor"
                          autoComplete="off"
                          placeholder="Órgão expedidor"
                          disabled={formData.naoInformarRg}
                          value={formData.orgaoExpedidor}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Data expedição *</label>
                        <input
                          type="date"
                          name="dataExpedicao"
                          autoComplete="off"
                          disabled={formData.naoInformarRg}
                          value={formData.dataExpedicao}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>
                    </div>

                    <div className={styles.checkboxLineFull}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          name="naoInformarRg"
                          checked={formData.naoInformarRg}
                          onChange={handleInputChange}
                        />
                        Não Informar RG
                      </label>
                    </div>

                    {/* Linha 3: 3 Colunas */}
                    <div
                      className={styles.gridRow3Equal}
                      style={{ marginTop: "12px" }}
                    >
                      <div className={styles.formGroup}>
                        <label>Estado civil *</label>
                        <select
                          name="estadoCivil"
                          value={formData.estadoCivil}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        >
                          <option value="">Selecione</option>
                          <option value="Solteiro">Solteiro(a)</option>
                          <option value="Casado">Casado(a)</option>
                          <option value="Divorciado">Divorciado(a)</option>
                          <option value="Viuvo">Viúvo(a)</option>
                        </select>
                      </div>
                      <div
                        className={styles.formGroup}
                        style={{ gridColumn: "span 2" }}
                      >
                        <label>Nacionalidade *</label>
                        <select
                          name="nacionalidade"
                          value={formData.nacionalidade}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        >
                          <option value="Brasileira(o)">Brasileira(o)</option>
                          <option value="Estrangeiro">Estrangeiro</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Seção: Contato (3 Colunas) */}
                  <div className={styles.sectionBlock}>
                    <h3 className={styles.sectionTitle}>Contato</h3>

                    <div className={styles.formGroup}>
                      <label>E-mail *</label>
                      <input
                        type="email"
                        name="email"
                        autoComplete="off"
                        placeholder="E-mail de contato do cliente"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={styles.textInput}
                      />
                    </div>

                    <div
                      className={styles.gridRow3Equal}
                      style={{ marginTop: "12px" }}
                    >
                      <div className={styles.formGroup}>
                        <label>Celular 1 (Obrigatório) *</label>
                        <input
                          type="text"
                          name="celular1"
                          autoComplete="off"
                          placeholder="(00) 00000-0000"
                          value={formData.celular1}
                          onChange={handlePhoneChange}
                          className={styles.textInput}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Celular 2 (Opcional)</label>
                        <input
                          type="text"
                          name="celular2"
                          autoComplete="off"
                          placeholder="(00) 00000-0000"
                          value={formData.celular2}
                          onChange={handlePhoneChange}
                          className={styles.textInput}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Celular 3 (Opcional)</label>
                        <input
                          type="text"
                          name="celular3"
                          autoComplete="off"
                          placeholder="(00) 00000-0000"
                          value={formData.celular3}
                          onChange={handlePhoneChange}
                          className={styles.textInput}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção: Endereço (3 Colunas) */}
                  <div className={styles.sectionBlock}>
                    <h3 className={styles.sectionTitle}>Endereço</h3>

                    <div
                      className={styles.gridRowCEPButton}
                      style={{ marginBottom: "12px" }}
                    >
                      <div className={styles.formGroup}>
                        <label>CEP *</label>
                        <input
                          type="text"
                          name="cep"
                          autoComplete="off"
                          placeholder="Digite o CEP"
                          value={formData.cep}
                          onChange={handleCepChange}
                          className={styles.textInput}
                        />
                      </div>

                      <div
                        className={styles.formGroup}
                        style={{ justifyContent: "flex-end" }}
                      >
                        <button
                          type="button"
                          className={styles.secondaryActionBtn}
                        >
                          Não sei o CEP
                        </button>
                      </div>
                    </div>

                    <div className={styles.gridRow3Equal}>
                      <div
                        className={styles.formGroup}
                        style={{ gridColumn: "span 2" }}
                      >
                        <label>Endereço *</label>
                        <input
                          type="text"
                          name="endereco"
                          autoComplete="off"
                          placeholder="Digite o endereço"
                          value={formData.endereco}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Número *</label>
                        <input
                          type="text"
                          name="numero"
                          autoComplete="off"
                          placeholder="Número"
                          value={formData.numero}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>
                    </div>

                    <div
                      className={styles.gridRow3Equal}
                      style={{ marginTop: "12px" }}
                    >
                      <div className={styles.formGroup}>
                        <label>Bairro *</label>
                        <input
                          type="text"
                          name="bairro"
                          autoComplete="off"
                          placeholder="Bairro"
                          value={formData.bairro}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Cidade *</label>
                        <input
                          type="text"
                          name="cidade"
                          autoComplete="off"
                          placeholder="Cidade"
                          value={formData.cidade}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>UF *</label>
                        <input
                          type="text"
                          name="uf"
                          autoComplete="off"
                          placeholder="UF"
                          value={formData.uf}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>
                    </div>

                    <div
                      className={styles.formGroup}
                      style={{ marginTop: "12px" }}
                    >
                      <label>Complemento</label>
                      <input
                        type="text"
                        name="complemento"
                        autoComplete="off"
                        placeholder="Casa, bloco, apartamento..."
                        value={formData.complemento}
                        onChange={handleInputChange}
                        className={styles.textInput}
                      />
                    </div>
                  </div>

                  {/* Seção: Dados profissionais e financeiros */}
                  <div className={styles.sectionBlock}>
                    <h3 className={styles.sectionTitle}>
                      Dados profissionais e financeiros
                    </h3>

                    <div className={styles.formGroup}>
                      <label>Profissão *</label>
                      <input
                        type="text"
                        name="profissao"
                        list="professions-list"
                        value={professionSearch}
                        onChange={(event) => {
                          const value = event.target.value;
                          const selectedProfession = professions.find(
                            (profession) =>
                              (profession.name || profession.description || "") === value
                          );
                          setProfessionSearch(value);
                          setRegistrationError("");
                          setFormData((previous) => ({
                            ...previous,
                            profissao: selectedProfession?.id || "",
                          }));
                        }}
                        onFocus={loadProfessions}
                        placeholder={isLoadingProfessions ? "Carregando profissões..." : "Busque a profissão do cliente"}
                        className={styles.textInput}
                        disabled={isLoadingProfessions}
                      />
                      <datalist id="professions-list">
                        {matchedProfessions.map((profession, index) => (
                          <option
                            key={`${profession.id || "profession"}-${profession.name || index}`}
                            value={profession.name || profession.description || profession.id}
                          />
                        ))}
                      </datalist>
                      {professionsError && <span className={styles.helperText}>{professionsError}</span>}
                    </div>

                    <div
                      className={styles.formGroup}
                      style={{ marginTop: "16px" }}
                    >
                      <label className={styles.labelTitle}>
                        Faixa de renda
                      </label>
                      <div className={styles.incomeGrid}>
                        <label
                          className={`${styles.incomeRadioCard} ${formData.faixaRenda === "1500" ? styles.selectedIncomeCard : ""}`}
                        >
                          <input
                            type="radio"
                            name="faixaRenda"
                            value="1500"
                            checked={formData.faixaRenda === "1500"}
                            onChange={handleInputChange}
                          />
                          <span>Até R$ 1.500</span>
                        </label>
                        <label
                          className={`${styles.incomeRadioCard} ${formData.faixaRenda === "4000" ? styles.selectedIncomeCard : ""}`}
                        >
                          <input
                            type="radio"
                            name="faixaRenda"
                            value="4000"
                            checked={formData.faixaRenda === "4000"}
                            onChange={handleInputChange}
                          />
                          <span>Entre R$ 1.501 e R$ 4.000</span>
                        </label>
                        <label
                          className={`${styles.incomeRadioCard} ${formData.faixaRenda === "7500" ? styles.selectedIncomeCard : ""}`}
                        >
                          <input
                            type="radio"
                            name="faixaRenda"
                            value="7500"
                            checked={formData.faixaRenda === "7500"}
                            onChange={handleInputChange}
                          />
                          <span>Entre R$ 4.001 e R$ 7.500</span>
                        </label>
                        <label
                          className={`${styles.incomeRadioCard} ${formData.faixaRenda === "mais7500" ? styles.selectedIncomeCard : ""}`}
                        >
                          <input
                            type="radio"
                            name="faixaRenda"
                            value="mais7500"
                            checked={formData.faixaRenda === "mais7500"}
                            onChange={handleInputChange}
                          />
                          <span>A partir R$ 7.500</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className={styles.sectionBlock}>
                    <h3 className={styles.sectionTitle}>
                      Pessoa politicamente exposta - PPE
                    </h3>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "#64748b",
                        lineHeight: "1.4",
                      }}
                    >
                      Consideram-se Pessoa Politicamente Exposta os agentes
                      públicos que desempenham ou tenham desempenhado, nos
                      últimos cinco anos...
                    </p>
                    <div
                      className={styles.formGroup}
                      style={{ marginTop: "10px" }}
                    >
                      <label className={styles.labelTitle}>
                        O cliente é pessoa politicamente exposta?
                      </label>
                      <div className={styles.radioGroup}>
                        <label className={styles.radioLabel}>
                          <input
                            type="radio"
                            name="isPpe"
                            value="sim"
                            checked={formData.isPpe === "sim"}
                            onChange={handleInputChange}
                          />{" "}
                          Sim
                        </label>
                        <label className={styles.radioLabel}>
                          <input
                            type="radio"
                            name="isPpe"
                            value="nao"
                            checked={formData.isPpe === "nao"}
                            onChange={handleInputChange}
                          />{" "}
                          Não
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </RegistrationStep>
          )}

          {/* ETAPA 3: Forma de Pagamento */}
          {currentStep === 3 && (
            <PaymentStep
              banks={banks}
              banksError={banksError}
              clientType={clientType}
              documentNumber={documentNumber}
              getBankValue={getBankValue}
              isLoadingBanks={isLoadingBanks}
              onPaymentChange={handlePaymentChange}
              paymentData={paymentData}
            />
          )}

          {/* ETAPA 4: Resumo da Venda */}
          {currentStep === 4 && (
            <SummaryStep>

              <div className={styles.summarySectionGroup}>
                <h3 className={styles.summarySectionTitle}>
                  {clientType === "juridica"
                    ? "Dados empresariais"
                    : "Dados pessoais"}
                </h3>
                <div className={styles.summaryCard}>
                  {clientType === "juridica"
                    ? renderSummaryFields([
                      ["Nome fantasia", formData.nomeFantasia],
                      ["Razão social", formData.razaoSocial],
                      ["Faturamento mensal", formData.faturamentoMensal],
                      ["Ramo de atividade", formData.ramoAtividade],
                      ["CNPJ", documentNumber],
                    ])
                    : renderSummaryFields([
                      ["Nome completo", formData.nomeCompleto],
                      ["Nome social", formData.isNomeSocial ? "Sim" : "Não"],
                      ["Pronome de preferência", formData.pronomePreferencia],
                      ["Sexo", formData.sexo],
                      ["Data de nascimento", formData.dataNascimento],
                      ["RG", formData.naoInformarRg ? "Não informado" : formData.rg],
                      ["Órgão expedidor", formData.naoInformarRg ? "Não informado" : formData.orgaoExpedidor],
                      ["Data de expedição", formData.naoInformarRg ? "Não informado" : formData.dataExpedicao],
                      ["Estado civil", formData.estadoCivil],
                      ["Nacionalidade", formData.nacionalidade],
                      ["CPF", documentNumber],
                    ])}
                </div>
              </div>

              <div className={styles.summarySectionGroup}>
                <h3 className={styles.summarySectionTitle}>
                  {clientType === "juridica" ? "Contato do representante" : "Contato"}
                </h3>
                <div className={styles.summaryCard}>
                  {renderSummaryFields(
                    clientType === "juridica"
                      ? [
                        ["Nome", formData.representanteNome],
                        ["E-mail", formData.representanteEmail],
                        ["Celular 1", formData.celular1],
                        ["Telefone 2", formData.celular2],
                        ["Telefone 3", formData.celular3],
                      ]
                      : [
                        ["E-mail", formData.email],
                        ["Celular 1", formData.celular1],
                        ["Celular 2", formData.celular2],
                        ["Celular 3", formData.celular3],
                      ]
                  )}
                </div>
              </div>

              <div className={styles.summarySectionGroup}>
                <h3 className={styles.summarySectionTitle}>Endereço</h3>
                <div className={styles.summaryCard}>
                  {renderSummaryFields([
                    ["CEP", formData.cep],
                    ["Endereço", formData.endereco],
                    ["Número", formData.numero],
                    ["Complemento", formData.complemento],
                    ["Bairro", formData.bairro],
                    ["Cidade", formData.cidade],
                    ["UF", formData.uf],
                  ])}
                </div>
              </div>

              {clientType === "fisica" && (
                <>
                  <div className={styles.summarySectionGroup}>
                    <h3 className={styles.summarySectionTitle}>Dados profissionais e financeiros</h3>
                    <div className={styles.summaryCard}>
                      {renderSummaryFields([
                        ["Profissão", professionSearch || formData.profissao],
                        ["Faixa de renda", incomeLabel],
                      ])}
                    </div>
                  </div>

                  <div className={styles.summarySectionGroup}>
                    <h3 className={styles.summarySectionTitle}>Pessoa politicamente exposta - PPE</h3>
                    <div className={styles.summaryCard}>
                      {renderSummaryFields([[
                        "O cliente é pessoa politicamente exposta?",
                        formData.isPpe === "sim" ? "Sim" : "Não",
                      ]])}
                    </div>
                  </div>
                </>
              )}

              <div className={styles.summarySectionGroup}>
                <h3 className={styles.summarySectionTitle}>Forma de pagamento</h3>
                <div className={styles.summaryCard}>
                  {renderSummaryFields([
                    ["Banco", paymentData.banco],
                    ["Agência", paymentData.agencia],
                    ["Dígito da agência", paymentData.digitoAgencia],
                    ["Conta corrente", paymentData.contaCorrente],
                  ])}
                </div>
              </div>

              {proposalData && proposalData.product_name && (
                <div className={styles.summarySectionGroup}>
                  <h3 className={styles.summarySectionTitle}>Produto selecionado</h3>
                  <div className={styles.summaryCard}>
                    {renderSummaryFields([
                      ["Produto", proposalData.product_name],
                      ["Quantidade", `${proposalData.quantity || 1} título(s)`],
                      ["Valor total", formatCurrency(proposalData.total_value)],
                      ["Vigência", proposalData.month_term > 0 ? `${proposalData.month_term} meses` : ""],
                    ])}
                  </div>
                </div>
              )}

              <label className={styles.summaryConfirmation}>
                <input
                  type="checkbox"
                  checked={isSummaryConfirmed}
                  onChange={(event) => setIsSummaryConfirmed(event.target.checked)}
                />
                <span>
                  Declaro que conferi todas as informações preenchidas e confirmo que estão corretas.
                </span>
              </label>
            </SummaryStep>
          )}

          {/* ETAPA 5: Assinatura por Token */}
          {currentStep === 5 && (
            <SignatureStep isTokenSent={isTokenSent} tokenMethod={tokenMethod}>

              {!isTokenSent ? (
                <div className={styles.tokenBox}>
                  <div className={styles.tokenDestinations}>
                    <span className={styles.tokenDestinationsTitle}>Destinos cadastrados</span>
                    <div className={styles.tokenDestinationsGrid}>
                      <div className={styles.tokenDestinationItem}>
                        <span>E-mail</span>
                        <strong title={clientType === "juridica" ? formData.representanteEmail : formData.email}>
                          {clientType === "juridica" ? formData.representanteEmail : formData.email}
                        </strong>
                      </div>
                      <div className={styles.tokenDestinationItem}>
                        <span>SMS</span>
                        <strong title={formData.celular1}>{formData.celular1}</strong>
                      </div>
                    </div>
                  </div>
                  <span className={styles.formSubLabel}>
                    Forma de recebimento
                  </span>

                  <div className={styles.incomeGrid}>
                    <label
                      className={`${styles.incomeRadioCard} ${tokenMethod === "email" ? styles.selectedIncomeCard : ""}`}
                    >
                      <input
                        type="radio"
                        name="tokenMethod"
                        checked={tokenMethod === "email"}
                        onChange={() => setTokenMethod("email")}
                      />
                      <span>E-mail</span>
                    </label>

                    <label
                      className={`${styles.incomeRadioCard} ${tokenMethod === "sms" ? styles.selectedIncomeCard : ""}`}
                    >
                      <input
                        type="radio"
                        name="tokenMethod"
                        checked={tokenMethod === "sms"}
                        onChange={() => setTokenMethod("sms")}
                      />
                      <span>SMS</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className={styles.tokenInputContainer}>
                  <div
                    style={{
                      textAlign: "center",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#334155",
                    }}
                  >
                    {tokenMethod === "email"
                      ? clientType === "juridica"
                        ? formData.representanteEmail
                        : formData.email
                      : formData.celular1}
                  </div>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="off"
                    placeholder="Digite o código de 4 dígitos"
                    value={tokenCode}
                    onChange={(event) => setTokenCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
                    className={styles.tokenCodeInput}
                    aria-invalid={tokenCode.length > 0 && !isTokenCodeValid}
                  />

                  <div className={styles.timerWrapper}>
                    <span className={styles.timerText}>
                      {formatTime(timer)}
                    </span>
                    <button
                      type="button"
                      onClick={handleSendToken}
                      disabled={timer > 0 || isSendingToken}
                      className={`${styles.resendButton} ${timer === 0 && !isSendingToken ? styles.activeResend : ""}`}
                    >
                      {isSendingToken ? (
                        "Reenviando token..."
                      ) : (
                        <>
                          Não recebeu o código?{" "}
                          <span>Clique aqui para reenviar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {tokenError && (
                    <div style={{ color: "#e11d48", fontSize: "0.85rem", marginTop: "8px", textAlign: "center" }}>
                      {tokenError}
                    </div>
                  )}

                  {confirmError && (
                    <div style={{
                      color: "#e11d48",
                      fontSize: "0.85rem",
                      marginTop: "8px",
                      textAlign: "center",
                      background: "#fff1f2",
                      border: "1px solid #fecdd3",
                      borderRadius: "8px",
                      padding: "10px 14px",
                    }}>
                      <strong>Erro ao confirmar token:</strong> {confirmError}
                    </div>
                  )}

                  <div style={{ textAlign: "center", marginTop: "12px" }}>
                    <button
                      type="button"
                      onClick={handleChangeMethod}
                      className={styles.changeMethodBtn}
                    >
                      ⇄ Alterar forma de recebimento do token
                    </button>
                  </div>
                </div>
              )}
            </SignatureStep>
          )}

          {/* ETAPA 6: Conclusão */}
          {currentStep === 6 && (
            <ConclusionStep
              onDownloadProposal={handleDownloadProposal}
              onNewProposal={handleNewProposal}
              proposalNumber={proposalNumber}
            />
          )}

          {/* Rodapé de Ações do Formulário */}
          {currentStep !== 6 && (
            <div className={styles.footerActions}>
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 1}
                className={styles.backButton}
              >
                Voltar
              </button>

              {currentStep === 5 && !isTokenSent ? (
                <button
                  type="button"
                  onClick={handleSendToken}
                  disabled={!tokenMethod || isSendingToken}
                  className={styles.nextButton}
                >
                  {isSendingToken ? "Enviando token..." : "Enviar token"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className={styles.nextButton}
                  disabled={
                    isSaving ||
                    isConfirmingToken ||
                    (currentStep === 4 && !isSummaryConfirmed) ||
                    (currentStep === 5 && isTokenSent && !isTokenCodeValid)
                  }
                >
                  {isConfirmingToken
                    ? "Confirmando token..."
                    : isSaving
                      ? "Salvando..."
                      : currentStep === 5
                        ? "Confirmar token e gerar proposta"
                        : "Avançar"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.devActions}>
        <DevAutoFillButton
          currentStep={currentStep}
          isRunning={isAutoFilling}
          onRun={handleAutoFillCurrentStep}
        />
        <button
          type="button"
          onClick={() => setIsJsonModalOpen(true)}
          className={styles.devFloatingButton}
          title="Visualizar JSON de envio das APIs em tempo real"
        >
          <span>🛠️</span>
          <span>Ver JSON de Envio (Dev)</span>
        </button>
      </div>

      {/* Modal Dev de Visualização do JSON em Tempo Real */}
      <Modal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        title="JSON de Envio para as APIs (Dev)"
        maxWidth="850px"
      >
        <div className={styles.jsonModalHeader}>
          <div className={styles.jsonModalBadges}>
            <span className={styles.stepBadge}>
              Etapa {currentStep}: {steps.find((s) => s.number === currentStep)?.title}
            </span>
            <span className={styles.liveBadge}>
              <span className={styles.liveDot}></span>
              Tempo Real
            </span>
          </div>
          <div className={styles.jsonModalActions}>
            <button
              type="button"
              onClick={handleCopyJson}
              className={styles.copyJsonButton}
            >
              {copiedJson ? "✓ Copiado!" : "📋 Copiar JSON"}
            </button>
          </div>
        </div>

        <div className={styles.jsonContainer}>
          {JSON.stringify(currentPayload, null, 2)}
        </div>
      </Modal>
    </>
  );
}
