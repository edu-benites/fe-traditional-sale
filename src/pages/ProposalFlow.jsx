import { useState, useEffect, useRef} from "react";
import { MainLayout } from "mag-design-system";
import styles from "./ProposalFlow.module.css";

export default function ProposalFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [clientType, setClientType] = useState("fisica");
  const [documentNumber, setDocumentNumber] = useState("");
  const numeroInputRef = useRef(null);
  const [isAddressLocked, setIsAddressLocked] = useState(false);

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

  const [tokenMethod, setTokenMethod] = useState("sms");
  const [isTokenSent, setIsTokenSent] = useState(false);
  const [tokenCode, setTokenCode] = useState("");
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval = null;
    if (isTokenSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTokenSent, timer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleSendToken = () => {
    if (!tokenMethod) return;
    setIsTokenSent(true);
    setTimer(60);
  };

  const handleChangeMethod = () => {
    setIsTokenSent(false);
    setTokenCode("");
    setTokenMethod("");
  };

  const steps = [
    { number: 1, title: "Identificação do Cliente" },
    { number: 2, title: "Cadastro" },
    { number: 3, title: "Forma de Pagamento" },
    { number: 4, title: "Resumo da Venda" },
    { number: 5, title: "Assinatura por Token" },
    { number: 6, title: "Conclusão" },
  ];

  const handleNext = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1 && currentStep !== 6) setCurrentStep(currentStep - 1);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
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
    alert(`Baixando o PDF da proposta nº ${proposalNumber}...`);
  };

  const handleNewProposal = () => {
    setCurrentStep(1);
    setClientType("");
    setDocumentNumber("");
    setProposalNumber("");
  };

  // Handler para trocar o tipo de cliente e limpar o campo de documento
  const handleClientTypeChange = (e) => {
    setClientType(e.target.value);
    setDocumentNumber(""); // Limpa o valor para evitar máscaras misturadas
  };

  // Handler para formatar celular/telefone fixo no padrão (00) 00000-0000 ou (00) 0000-0000
  const handlePhoneChange = (e) => {
    const { name, value } = e.target;

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
        const response = await fetch(`https://apis-hmg.magcap.com.br/api/sales-cap/v1/postalcode/${value}`, {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjI1MTNGMkE5MjcyRjEzRjkwNkVFQTJDMkUzNEMyM0JBMTZDNEI2QUYiLCJ0eXAiOiJKV1QiLCJ4NXQiOiJKUlB5cVNjdkVfa0c3cUxDNDB3anVoYkV0cTgifQ.eyJuYmYiOjE3ODM5NzU1OTMsImV4cCI6MTc4NDA2MTk5MywiaXNzIjoiaHR0cHM6Ly9pZGVudGlkYWRlaG1nLm1hZ2NhcC5jb20uYnIiLCJhdWQiOlsiaHR0cHM6Ly9pZGVudGlkYWRlaG1nLm1hZ2NhcC5jb20uYnIvcmVzb3VyY2VzIiwiMWU2YTllYmQtZTI4ZC00OGNiLTkxNjUtOTQ1YTMwNDBiOTNlIl0sImNsaWVudF9pZCI6InVzcl9jYXBfYXBpX2htZyIsImNsaWVudF9jcGYiOiJvcGVyYWNhbyIsImNsaWVudF9lbXByZXNhIjpbIjAyMDM4MjJjMDAwODMwIiwiMDQ4OTE4NTAwMDAxODgiLCIyMjA4NTAwMzAwMDEwOCIsIjI0NDgzMTAwMDAxMDciLCIzMzYwODMwODAwMDE3MyIsIjUyNzgwNTUxMDAwMTE5Il0sImp0aSI6ImhJd1NDeWVsc2JqdF94NWI4a2ZSYkEiLCJzY29wZSI6WyJjYXAuYXBpIl19.TAvlGt123h_3oRUcIeRz_Qu2ADALB-FnQT0SZ_lOrLVZpBe82fdobQ9SnLzf6_tgFnaOtZ0mXt5phRByzGJKT2DQMZv2PWQiXE1qxPReiGPmJHZoNG4T_YAJUuI50yfP-FYE_cLozFcSbwavh2xsDPm0JlAdi1fxSe9yNlwACHOg-yq35T60eIPn17ENS4Q2N5bA47iCGnpfHHkXHRCi2DzCz--LB0pd3pidZxCziiAns_EW8gyXV5jvYNvxdQeAZir3A950Zre0SShPqWIkID-jQ3XVkcX6-B81Uoz5UAr4ZcKPpwfbVgK4BgWMukorSmaPiIImF3f2Dd7Pg1aSNw'
          }
        });

        if (response.ok) {
          const data = await response.json();
          
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
    <MainLayout>
      <div className={styles.pageContainer}>
        {/* Linha do Tempo / Stepper Corporativo */}
        <div className={styles.stepperContainer}>
          <div className={styles.stepperTrack}></div>
          {steps.map((step) => {
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;

            return (
              <div key={step.number} className={styles.stepItem}>
                <div
                  className={`
                    ${styles.stepCircle} 
                    ${isCompleted ? styles.completed : ""} 
                    ${isCurrent ? styles.current : ""}
                  `}
                >
                  {isCompleted ? "✓" : step.number}
                </div>
                <span
                  className={`${styles.stepTitle} ${isCurrent ? styles.activeText : ""}`}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Conteúdo Dinâmico por Etapa */}
        <div
          className={styles.contentCard}
          style={{ maxWidth: currentStep === 2 ? "850px" : "700px" }}
        >
          {/* ETAPA 1: Identificação do Cliente */}
          {currentStep === 1 && (
            <div className={styles.stepContent}>
              <div className={styles.cardHeader}>
                <h2>Identificação do cliente</h2>
                <p>
                  Com o CPF/CNPJ vamos descobrir se é um novo cliente ou não.
                </p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.labelTitle}>Tipo de cliente</label>
                <div className={styles.incomeGrid}>
                  <label
                    className={`${styles.incomeRadioCard} ${clientType === "fisica" ? styles.selectedIncomeCard : ""}`}
                  >
                    <input
                      type="radio"
                      name="clientType"
                      checked={clientType === "fisica"}
                      onChange={() => {
                        setClientType("fisica");
                        setDocumentNumber("");
                      }}
                    />
                    <span>Pessoa física</span>
                  </label>

                  <label
                    className={`${styles.incomeRadioCard} ${clientType === "juridica" ? styles.selectedIncomeCard : ""}`}
                  >
                    <input
                      type="radio"
                      name="clientType"
                      checked={clientType === "juridica"}
                      onChange={() => {
                        setClientType("juridica");
                        setDocumentNumber("");
                      }}
                    />
                    <span>Pessoa jurídica</span>
                  </label>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>{clientType === "fisica" ? "CPF" : "CNPJ"}</label>
                <input
                  type="text"
                  placeholder={
                    clientType === "fisica"
                      ? "000.000.000-00"
                      : "AA.AAA.AAA/AAAA-99"
                  }
                  value={documentNumber}
                  onChange={handleDocumentChange}
                  className={styles.input}
                />
              </div>
            </div>
          )}

          {/* ETAPA 2: Cadastro */}
          {currentStep === 2 && (
            <div className={styles.stepContent}>
              <div className={styles.cardHeader}>
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "#64748b",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  {clientType === "juridica"
                    ? "Pessoa jurídica"
                    : "Pessoa física"}
                </span>
                <h2 style={{ margin: "2px 0 4px 0" }}>Ficha de cadastro</h2>
                <p>
                  {clientType === "juridica"
                    ? "Preencha com as informações da empresa e dos sócios."
                    : "Preencha com as informações do cliente."}
                </p>
              </div>

              {clientType === "juridica" ? (
                /* ================= CADASTRO PJ ================= */
                <>
                  {/* Seção: Dados Empresariais */}
                  <div
                    className={styles.sectionBlock}
                    style={{ borderTop: "none", paddingTop: 0 }}
                  >
                    <h3 className={styles.sectionTitle}>Dados empresariais</h3>

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
                      className={styles.gridRow}
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
                          placeholder="Digite o e-mail de contato do cliente"
                          value={formData.representanteEmail}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>
                    </div>

                    <div
                      className={styles.formGroup}
                      style={{ marginBottom: "12px" }}
                    >
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

                    <div
                      className={styles.formGroup}
                      style={{ marginBottom: "12px" }}
                    >
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
                </>
              ) : (
                /* ================= CADASTRO PESSOA FÍSICA ================= */
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
                      <select
                        name="profissao"
                        value={formData.profissao}
                        onChange={handleInputChange}
                        className={styles.textInput}
                      >
                        <option value="">Busque a profissão do cliente</option>
                        <option value="Analista">Analista de Sistemas</option>
                        <option value="Engenheiro">Engenheiro</option>
                        <option value="Outros">Outros</option>
                      </select>
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
            </div>
          )}

          {/* ETAPA 3: Forma de Pagamento */}
          {currentStep === 3 && (
            <div className={styles.stepContent}>
              <div className={styles.cardHeader}>
                <h2>Forma de pagamento</h2>
                <p>Preencha com as informações do cliente.</p>
              </div>

              <div
                className={styles.formGroup}
                style={{
                  backgroundColor: "#f8fafc",
                  padding: "12px",
                  borderRadius: "6px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  {clientType === "juridica"
                    ? "CNPJ do titular"
                    : "CPF do titular"}
                </span>
                <strong
                  style={{
                    fontSize: "1rem",
                    color: "#003366",
                    marginTop: "2px",
                  }}
                >
                  {documentNumber}
                </strong>
              </div>

              <div className={styles.formGroup}>
                <label>Banco *</label>
                <select
                  name="banco"
                  value={paymentData.banco}
                  onChange={handlePaymentChange}
                  className={styles.textInput}
                >
                  <option value="341 - Itau">341 - Itau</option>
                  <option value="237 - Bradesco">237 - Bradesco</option>
                  <option value="001 - Banco do Brasil">
                    001 - Banco do Brasil
                  </option>
                  <option value="104 - Caixa Econômica">
                    104 - Caixa Econômica
                  </option>
                  <option value="033 - Santander">033 - Santander</option>
                </select>
              </div>

              <div className={styles.gridRowAgencyAccount}>
                <div className={styles.formGroup}>
                  <label>Agência *</label>
                  <input
                    type="text"
                    name="agencia"
                    autoComplete="off"
                    value={paymentData.agencia}
                    onChange={handlePaymentChange}
                    className={styles.textInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Dígito agência</label>
                  <input
                    type="text"
                    name="digitoAgencia"
                    autoComplete="off"
                    value={paymentData.digitoAgencia}
                    onChange={handlePaymentChange}
                    placeholder="Dígito"
                    className={styles.textInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Conta corrente *</label>
                  <input
                    type="text"
                    name="contaCorrente"
                    autoComplete="off"
                    value={paymentData.contaCorrente}
                    onChange={handlePaymentChange}
                    className={styles.textInput}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 4: Resumo da Venda */}
          {currentStep === 4 && (
            <div className={styles.stepContent}>
              <div className={styles.cardHeader}>
                <h2>Resumo da contratação</h2>
                <p>Confira as informações do cliente para ir à última etapa.</p>
              </div>

              <div className={styles.summarySectionGroup}>
                <h3 className={styles.summarySectionTitle}>
                  {clientType === "juridica"
                    ? "Dados empresariais"
                    : "Dados pessoais"}
                </h3>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryField}>
                    <span className={styles.summaryLabel}>
                      {clientType === "juridica"
                        ? "Nome fantasia"
                        : "Nome completo"}
                    </span>
                    <strong className={styles.summaryValue}>
                      {clientType === "juridica"
                        ? formData.nomeFantasia
                        : formData.nomeCompleto}
                    </strong>
                  </div>
                  <div className={styles.summaryField}>
                    <span className={styles.summaryLabel}>
                      {clientType === "juridica" ? "CNPJ" : "CPF"}
                    </span>
                    <strong className={styles.summaryValue}>
                      {documentNumber}
                    </strong>
                  </div>
                  <div className={styles.summaryField}>
                    <span className={styles.summaryLabel}>E-mail</span>
                    <strong className={styles.summaryValue}>
                      {clientType === "juridica"
                        ? formData.representanteEmail
                        : formData.email}
                    </strong>
                  </div>
                  <div className={styles.summaryField}>
                    <span className={styles.summaryLabel}>Telefone</span>
                    <strong className={styles.summaryValue}>
                      {formData.celular1}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 5: Assinatura por Token */}
          {currentStep === 5 && (
            <div className={styles.stepContent}>
              <div className={styles.cardHeader}>
                <h2>Assinatura por token</h2>
                <p>
                  {!isTokenSent
                    ? "Selecione o formato para que seu cliente receba o token de assinatura virtual da proposta:"
                    : `Código de autenticação Enviado por ${tokenMethod === "email" ? "E-MAIL" : "SMS"}`}
                </p>
              </div>

              {!isTokenSent ? (
                <div className={styles.tokenBox}>
                  <span className={styles.formSubLabel}>
                    Forma de recebimento
                  </span>

                  <div className={styles.tokenOptionsGrid}>
                    <label
                      className={`${styles.tokenCardOption} ${tokenMethod === "email" ? styles.selectedCard : ""}`}
                    >
                      <input
                        type="radio"
                        name="tokenMethod"
                        checked={tokenMethod === "email"}
                        onChange={() => setTokenMethod("email")}
                      />
                      <div>
                        <strong>E-mail</strong>
                        <span className={styles.tokenContactText}>
                          {clientType === "juridica"
                            ? formData.representanteEmail
                            : formData.email}
                        </span>
                      </div>
                    </label>

                    <label
                      className={`${styles.tokenCardOption} ${tokenMethod === "sms" ? styles.selectedCard : ""}`}
                    >
                      <input
                        type="radio"
                        name="tokenMethod"
                        checked={tokenMethod === "sms"}
                        onChange={() => setTokenMethod("sms")}
                      />
                      <div>
                        <strong>SMS</strong>
                        <span className={styles.tokenContactText}>
                          {formData.celular1}
                        </span>
                      </div>
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
                    maxLength={6}
                    autoComplete="off"
                    placeholder="Digite o código"
                    value={tokenCode}
                    onChange={(e) => setTokenCode(e.target.value)}
                    className={styles.tokenCodeInput}
                  />

                  <div className={styles.timerWrapper}>
                    <span className={styles.timerText}>
                      {formatTime(timer)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTimer(60)}
                      disabled={timer > 0}
                      className={`${styles.resendButton} ${timer === 0 ? styles.activeResend : ""}`}
                    >
                      Não recebeu o código?{" "}
                      <span>Clique aqui para reenviar</span>
                    </button>
                  </div>

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
            </div>
          )}

          {/* ETAPA 6: Conclusão */}
          {currentStep === 6 && (
            <div className={styles.stepContent}>
              <div
                className={styles.cardHeader}
                style={{ textAlign: "center" }}
              >
                <h2>Conclusão</h2>
                <p>
                  Para concluir a venda, o seu cliente tem alguns passos a
                  completar para concluir a contratação. Entenda abaixo:
                </p>
              </div>

              <div className={styles.conclusionContainer}>
                <span className={styles.conclusionSubTitle}>
                  Geração da proposta
                </span>

                <div className={styles.proposalBox}>
                  <span className={styles.proposalLabelText}>
                    O número da proposta gerada é:
                  </span>
                  <strong className={styles.proposalNumberText}>
                    {proposalNumber}
                  </strong>

                  <button
                    type="button"
                    onClick={handleDownloadProposal}
                    className={styles.downloadProposalBtn}
                  >
                    ⬇ Baixar proposta
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleNewProposal}
                  className={styles.newProposalBtn}
                >
                  + Nova Proposta
                </button>
              </div>
            </div>
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
                  disabled={!tokenMethod}
                  className={styles.nextButton}
                >
                  Enviar token
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className={styles.nextButton}
                >
                  Avançar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
