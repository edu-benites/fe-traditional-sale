import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import PartnerHeader from "../components/PartnerHeader/PartnerHeader";
import { savePartnerBranding } from "../services/partnerBranding";
import { getPartners } from "../services/partnerService";
import styles from "./Envio.module.css";

const initialForm = {
  // Identificação e Proposta
  documentoTitular: "",
  propostaId: "",
  chaveTitulo: "",

  // Dados Pessoais / Pessoa Física
  nomeCompleto: "",
  dataNascimento: "",
  email: "",
  celular: "",

  // Dados Pessoa Jurídica
  razaoSocial: "",
  nomeFantasia: "",
  representanteNome: "",
  representanteEmail: "",
  telefoneEmpresa: "",

  // Endereço
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",

  // Dados Bancários
  banco: "",
  tipoConta: "",
  agencia: "",
  conta: "",
  digito: "",

  // PEP (Pessoa Exposta Politicamente)
  isPep: "nao",

};

export default function Envio() {
  const [searchParams] = useSearchParams();
  const [clientType, setClientType] = useState("fisica");
  const [formData, setFormData] = useState(initialForm);
  const [isLoadingPartner, setIsLoadingPartner] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isAddressLocked, setIsAddressLocked] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  const [proposalError, setProposalError] = useState("");
  const [documentFiles, setDocumentFiles] = useState({});
  const [documentationError, setDocumentationError] = useState("");

  const cnpjPartner = searchParams.get("CNPJPartner") || "";
  const formType = searchParams.get("TipoForm") || "Sorteio";
  const paymentType = formType.toLowerCase() === "resgate" ? "Resgate" : "Sorteio";

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Formulário de Pagamento";

    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    const loadPartner = async () => {
      if (!cnpjPartner) {
        setIsLoadingPartner(false);
        return;
      }

      try {
        const data = await getPartners(cnpjPartner);

        savePartnerBranding(cnpjPartner, data);
      } catch (error) {
        console.error("Erro ao carregar parceiro:", error);
      } finally {
        setIsLoadingPartner(false);
      }
    };

    loadPartner();
  }, [cnpjPartner]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "file" ? files : value,
    }));
  };

  const getProposalId = (proposal) =>
    proposal?.numeroProposta ||
    proposal?.id ||
    proposal?.proposalId ||
    proposal?.proposalNumber ||
    proposal?.number ||
    proposal?.Number ||
    proposal?.generalInfo?.number ||
    proposal?.GeneralInfo?.Number ||
    "";

  const getTitleKeys = (proposal) => {
    const keys =
      proposal?.chaveTitulos ||
      proposal?.titleKeys ||
      proposal?.titleKey ||
      proposal?.titleKeyList ||
      proposal?.titles ||
      proposal?.keys ||
      [];

    return Array.isArray(keys) ? keys : [keys];
  };

  const getTitleKeyValue = (titleKey) =>
    typeof titleKey === "object"
      ? titleKey?.key || titleKey?.titleKey || titleKey?.id || titleKey?.number || ""
      : titleKey;

  const getTitleKeyLabel = (titleKey) =>
    typeof titleKey === "object"
      ? titleKey?.description || titleKey?.label || getTitleKeyValue(titleKey)
      : titleKey;

  const getPendingDocumentGroups = (proposal) =>
    (proposal?.pendencia || proposal?.pendencias || []).map((pendency) => {
      const documents = pendency?.doc || pendency?.docs || [];
      return Array.isArray(documents) ? documents : [documents];
    }).filter((documents) => documents.length > 0);

  const loadPendingProposals = async (document) => {
    setIsLoadingProposals(true);
    setProposalError("");
    setProposals([]);
    setDocumentFiles({});
    setDocumentationError("");
    setFormData((prev) => ({ ...prev, propostaId: "", chaveTitulo: "" }));

    try {
      const response = await api.get("/api/benefit-cap/v1/pendency/proposal", {
        headers: {
          cnpj: cnpjPartner,
          document,
          type: paymentType,
        },
      });
      const payload = response.data?.data || response.data;
      const items = Array.isArray(payload)
        ? payload
        : payload?.proposals || payload?.items || payload?.pendingProposals || [];

      setProposals(items);
      if (!items.length) {
        setProposalError("Nenhuma proposta pendente foi encontrada para este documento.");
      }
    } catch (error) {
      console.error("Erro ao buscar propostas pendentes:", error);
      setProposalError("Não foi possível consultar as propostas para este documento.");
    } finally {
      setIsLoadingProposals(false);
    }
  };

  const handleDocumentChange = (e) => {
    const { name, value } = e.target;
    let formattedValue;

    if (clientType === "fisica") {
      const digits = value.replace(/\D/g, "").slice(0, 11);
      formattedValue = digits.slice(0, 3);
      if (digits.length > 3) formattedValue += `.${digits.slice(3, 6)}`;
      if (digits.length > 6) formattedValue += `.${digits.slice(6, 9)}`;
      if (digits.length > 9) formattedValue += `-${digits.slice(9, 11)}`;
    } else {
      const alphanumeric = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 14);
      formattedValue = alphanumeric.slice(0, 2);
      if (alphanumeric.length > 2) formattedValue += `.${alphanumeric.slice(2, 5)}`;
      if (alphanumeric.length > 5) formattedValue += `.${alphanumeric.slice(5, 8)}`;
      if (alphanumeric.length > 8) formattedValue += `/${alphanumeric.slice(8, 12)}`;
      if (alphanumeric.length > 12) formattedValue += `-${alphanumeric.slice(12, 14)}`;
    }

    setFormData((prev) => ({ ...prev, [name]: formattedValue }));

    const document = formattedValue.replace(/[^a-zA-Z0-9]/g, "");
    const isCompleteDocument =
      (clientType === "fisica" && document.length === 11) ||
      (clientType === "juridica" && document.length === 14);

    if (isCompleteDocument) {
      loadPendingProposals(document);
    } else {
      setProposals([]);
      setProposalError("");
      setDocumentFiles({});
      setDocumentationError("");
      setFormData((prev) => ({ ...prev, propostaId: "", chaveTitulo: "" }));
    }
  };

  const handleClientTypeChange = (type) => {
    setClientType(type);
    setFormData((prev) => ({
      ...prev,
      documentoTitular: "",
      propostaId: "",
      chaveTitulo: "",
    }));
    setProposals([]);
    setProposalError("");
    setDocumentFiles({});
    setDocumentationError("");
  };

  const handleProposalChange = (e) => {
    setFormData((prev) => ({ ...prev, propostaId: e.target.value, chaveTitulo: "" }));
    setDocumentFiles({});
    setDocumentationError("");
  };

  const handleDocumentFileChange = (e, documentKey) => {
    setDocumentFiles((prev) => ({ ...prev, [documentKey]: e.target.files }));
    setDocumentationError("");
  };

  const handleCepChange = async (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    const cep = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;

    setFormData((prev) => ({ ...prev, cep }));

    if (digits.length < 8) {
      setIsAddressLocked(false);
      return;
    }

    try {
      const response = await api.get(`/api/sales-cap/v1/postalcode/${digits}`);
      const address = response.data?.data || response.data;

      setFormData((prev) => ({
        ...prev,
        logradouro: address?.logradouro || address?.street || "",
        bairro: address?.bairro || address?.neighborhood || "",
        cidade: address?.cidade || address?.city || "",
        uf: address?.uf || address?.state || "",
      }));
      setIsAddressLocked(true);
    } catch (error) {
      console.error("Erro ao buscar o CEP:", error);
      setIsAddressLocked(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const hasMissingDocument = pendingDocumentGroups.some((documents, groupIndex) =>
      !documents.some((_, documentIndex) =>
        documentFiles[`${groupIndex}-${documentIndex}`]?.length > 0
      )
    );

    if (hasMissingDocument) {
      setDocumentationError("Anexe ao menos um documento para cada pendência solicitada.");
      return;
    }

    setIsSubmitted(true);
  };

  const selectedProposal = proposals.find(
    (proposal) => String(getProposalId(proposal)) === String(formData.propostaId)
  );
  const titleKeys = selectedProposal ? getTitleKeys(selectedProposal) : [];
  const pendingDocumentGroups = selectedProposal
    ? getPendingDocumentGroups(selectedProposal)
    : [];

  if (isLoadingPartner) {
    return (
      <>
        <PartnerHeader />
        <main className={styles.pageContainer}>
          <div className={styles.contentCard}>
            <p className={styles.loading}>Carregando informações...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <PartnerHeader />
      <main className={styles.pageContainer}>
        <header className={styles.pageIntro}>
          <p className={styles.eyebrow}>{paymentType}</p>
          <h1>Formulário de Pagamento de {paymentType}</h1>
          <p>Localize a proposta, envie a documentação solicitada e complete os dados para pagamento.</p>
        </header>
        <section className={styles.contentCard}>
          {isSubmitted ? (
            <div className={styles.successMessage} role="status">
              Formulário preenchido e enviado com sucesso.
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              {/* Seletor de Tipo de Cliente */}
              <div className={styles.clientType}>
                <button
                  type="button"
                  className={clientType === "fisica" ? styles.selectedType : ""}
                  onClick={() => handleClientTypeChange("fisica")}
                >
                  Pessoa Física
                </button>
                <button
                  type="button"
                  className={clientType === "juridica" ? styles.selectedType : ""}
                  onClick={() => handleClientTypeChange("juridica")}
                >
                  Pessoa Jurídica
                </button>
              </div>

              {/* Bloco 1: Identificação e Proposta */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Identificação e Proposta</h2>
                  <p>Informe os dados iniciais para localização do cadastro.</p>
                </div>
                <div className={styles.grid}>
                  <label>
                    Informe o {clientType === "fisica" ? "CPF" : "CNPJ"} do titular *
                    <input
                      type="text"
                      name="documentoTitular"
                      value={formData.documentoTitular}
                      onChange={handleDocumentChange}
                      placeholder={clientType === "fisica" ? "000.000.000-00" : "00.000.000/0001-00"}
                      required
                    />
                  </label>
                  <label>
                    Selecione a proposta *
                    <select
                      name="propostaId"
                      value={formData.propostaId}
                      onChange={handleProposalChange}
                      disabled={!proposals.length || isLoadingProposals}
                      required
                    >
                      <option value="">
                        {isLoadingProposals ? "Consultando propostas..." : "Selecione"}
                      </option>
                      {proposals.map((proposal, index) => {
                        const proposalId = getProposalId(proposal);
                        return (
                          <option key={proposalId || index} value={proposalId}>
                            {proposal?.description || proposal?.name || `Proposta ${proposalId}`}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  {selectedProposal && (
                    <label>
                      Chave de título {titleKeys.length ? "*" : ""}
                      <select
                        name="chaveTitulo"
                        value={formData.chaveTitulo}
                        onChange={handleChange}
                        disabled={!titleKeys.length}
                        required={titleKeys.length > 0}
                      >
                        <option value="">Selecione</option>
                        {titleKeys.map((titleKey, index) => {
                          const value = getTitleKeyValue(titleKey);
                          return (
                            <option key={value || index} value={value}>
                              {getTitleKeyLabel(titleKey)}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                  )}
                </div>
                {proposalError && <p className={styles.helperText}>{proposalError}</p>}
              </section>

              {selectedProposal && (
                <>
              {/* Bloco 2: Seleção de Arquivos */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Documentação</h2>
                  <p>Anexe os arquivos comprobatórios exigidos.</p>
                </div>
                {pendingDocumentGroups.length ? (
                  <div className={styles.documentGroups}>
                    {pendingDocumentGroups.map((documents, groupIndex) => (
                      <div className={styles.documentGroup} key={groupIndex}>
                        <p>
                          {documents.length === 1
                            ? "Documento obrigatório"
                            : "Anexe ao menos um dos documentos abaixo"}
                        </p>
                        <div className={styles.grid}>
                          {documents.map((document, documentIndex) => {
                            const documentKey = `${groupIndex}-${documentIndex}`;
                            const documentName = document?.tipoDocumento || "Documento";

                            return (
                              <label key={documentKey}>
                                {documentName}{documents.length === 1 ? " *" : ""}
                                <input
                                  className={styles.fileInput}
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => handleDocumentFileChange(e, documentKey)}
                                  required={documents.length === 1}
                                />
                                <span className={styles.fileHint}>
                                  Selecione um arquivo em PDF, JPG ou PNG
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.helperText}>
                    Selecione uma proposta para visualizar os documentos solicitados.
                  </p>
                )}
                {documentationError && <p className={styles.helperText}>{documentationError}</p>}
              </section>

              {/* Bloco 3: Dados Cadastrais (Dinâmico: PF ou PJ) */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>{clientType === "fisica" ? "Dados Pessoais" : "Dados da Empresa (Pessoa Jurídica)"}</h2>
                  <p>Confira e preencha as informações cadastrais.</p>
                </div>

                {clientType === "fisica" ? (
                  <div className={styles.grid}>
                    <label>
                      Nome completo *
                      <input
                        type="text"
                        name="nomeCompleto"
                        value={formData.nomeCompleto}
                        onChange={handleChange}
                        placeholder="Digite seu nome completo"
                        required
                      />
                    </label>
                    <label>
                      Data de nascimento *
                      <input
                        type="date"
                        name="dataNascimento"
                        value={formData.dataNascimento}
                        onChange={handleChange}
                        required
                      />
                    </label>
                    <label>
                      E-mail *
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="seu@email.com"
                        required
                      />
                    </label>
                    <label>
                      Celular *
                      <input
                        type="text"
                        name="celular"
                        value={formData.celular}
                        onChange={handleChange}
                        placeholder="(00) 00000-0000"
                        required
                      />
                    </label>
                  </div>
                ) : (
                  <div className={styles.grid}>
                    <label className={styles.fullWidth}>
                      Razão Social *
                      <input
                        type="text"
                        name="razaoSocial"
                        value={formData.razaoSocial}
                        onChange={handleChange}
                        placeholder="Razão Social da Empresa"
                        required
                      />
                    </label>
                    <label>
                      Nome Fantasia
                      <input
                        type="text"
                        name="nomeFantasia"
                        value={formData.nomeFantasia}
                        onChange={handleChange}
                        placeholder="Nome Fantasia"
                      />
                    </label>
                    <label>
                      E-mail corporativo *
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="empresa@email.com"
                        required
                      />
                    </label>
                    <label>
                      Telefone / Celular *
                      <input
                        type="text"
                        name="telefoneEmpresa"
                        value={formData.telefoneEmpresa}
                        onChange={handleChange}
                        placeholder="(00) 0000-0000"
                        required
                      />
                    </label>
                    <label>
                      Nome do representante legal *
                      <input
                        type="text"
                        name="representanteNome"
                        value={formData.representanteNome}
                        onChange={handleChange}
                        placeholder="Nome completo do representante"
                        required
                      />
                    </label>
                    <label>
                      E-mail do representante *
                      <input
                        type="email"
                        name="representanteEmail"
                        value={formData.representanteEmail}
                        onChange={handleChange}
                        placeholder="representante@email.com"
                        required
                      />
                    </label>
                  </div>
                )}
              </section>

              {/* Bloco 4: Endereço */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Endereço</h2>
                  <p>Informe o endereço de localização.</p>
                </div>
                <div className={styles.grid}>
                  <label>
                    CEP *
                    <input
                      type="text"
                      name="cep"
                      value={formData.cep}
                      onChange={handleCepChange}
                      placeholder="00000-000"
                      inputMode="numeric"
                      required
                    />
                  </label>
                  <label className={styles.fullWidth}>
                    Logradouro *
                    <input
                      type="text"
                      name="logradouro"
                      value={formData.logradouro}
                      onChange={handleChange}
                      placeholder="Rua, Avenida, etc."
                      disabled={isAddressLocked}
                      required
                    />
                  </label>
                  <label>
                    Número *
                    <input
                      type="text"
                      name="numero"
                      value={formData.numero}
                      onChange={handleChange}
                      placeholder="Número"
                      required
                    />
                  </label>
                  <label>
                    Complemento
                    <input
                      type="text"
                      name="complemento"
                      value={formData.complemento}
                      onChange={handleChange}
                      placeholder="Apto, Bloco, Sala, etc."
                    />
                  </label>
                  <label>
                    Bairro *
                    <input
                      type="text"
                      name="bairro"
                      value={formData.bairro}
                      onChange={handleChange}
                      placeholder="Bairro"
                      disabled={isAddressLocked}
                      required
                    />
                  </label>
                  <label>
                    Cidade *
                    <input
                      type="text"
                      name="cidade"
                      value={formData.cidade}
                      onChange={handleChange}
                      placeholder="Cidade"
                      disabled={isAddressLocked}
                      required
                    />
                  </label>
                  <label>
                    UF *
                    <input
                      type="text"
                      name="uf"
                      value={formData.uf}
                      onChange={handleChange}
                      placeholder="UF"
                      disabled={isAddressLocked}
                      maxLength="2"
                      required
                    />
                  </label>
                </div>
              </section>

              {/* Bloco 5: Dados Bancários */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Dados Bancários</h2>
                  <p>Informe a conta para crédito dos valores.</p>
                </div>
                <div className={styles.grid}>
                  <label>
                    Banco *
                    <input
                      type="text"
                      name="banco"
                      value={formData.banco}
                      onChange={handleChange}
                      placeholder="Nome ou Código do Banco"
                      required
                    />
                  </label>
                  <label>
                    Tipo de Conta *
                    <input
                      type="text"
                      name="tipoConta"
                      value={formData.tipoConta}
                      onChange={handleChange}
                      placeholder="Corrente / Poupança"
                      required
                    />
                  </label>
                  <label>
                    Agência *
                    <input
                      type="text"
                      name="agencia"
                      value={formData.agencia}
                      onChange={handleChange}
                      placeholder="Agência"
                      required
                    />
                  </label>
                  <label>
                    Conta *
                    <input
                      type="text"
                      name="conta"
                      value={formData.conta}
                      onChange={handleChange}
                      placeholder="Número da conta"
                      required
                    />
                  </label>
                  <label>
                    Dígito *
                    <input
                      type="text"
                      name="digito"
                      value={formData.digito}
                      onChange={handleChange}
                      placeholder="Dígito"
                      maxLength="2"
                      required
                    />
                  </label>
                </div>
              </section>

              {/* Bloco 6: Pessoa Exposta Politicamente (PEP) */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Pessoa Exposta Politicamente (PEP)</h2>
                  <p>Você (ou administradores/representantes) se enquadra como Pessoa Exposta Politicamente?</p>
                </div>
                <div className={styles.clientType}>
                  <button
                    type="button"
                    className={formData.isPep === "nao" ? styles.selectedType : ""}
                    onClick={() => setFormData((prev) => ({ ...prev, isPep: "nao" }))}
                  >
                    Não
                  </button>
                  <button
                    type="button"
                    className={formData.isPep === "sim" ? styles.selectedType : ""}
                    onClick={() => setFormData((prev) => ({ ...prev, isPep: "sim" }))}
                  >
                    Sim
                  </button>
                </div>
              </section>

              <button className={styles.submitButton} type="submit">
                Enviar formulário
              </button>
                </>
              )}
            </form>
          )}
        </section>
      </main>
    </>
  );
}
