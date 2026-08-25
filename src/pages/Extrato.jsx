import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import PartnerHeader from "../components/PartnerHeader/PartnerHeader";
import { getActivePartnerCnpj, savePartnerBranding } from "../services/partnerBranding";
import { getPartners } from "../services/partnerService";
import styles from "./Extrato.module.css";

const formatLabel = (value) =>
  String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (character) => character.toUpperCase());

const formatValue = (value) => {
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const getFieldValue = (item, fieldNames) => {
  const normalizedNames = fieldNames.map((name) => name.toLowerCase());
  const key = Object.keys(item || {}).find((itemKey) =>
    normalizedNames.includes(itemKey.toLowerCase())
  );
  return key ? item[key] : null;
};

const getNestedFieldValue = (data, fieldNames) => {
  if (!data || typeof data !== "object") return null;

  if (!Array.isArray(data)) {
    const directValue = getFieldValue(data, fieldNames);
    if (directValue !== null && typeof directValue !== "object") return directValue;
  }

  for (const value of Object.values(data)) {
    const foundValue = getNestedFieldValue(value, fieldNames);
    if (foundValue !== null) return foundValue;
  }

  return null;
};

const getPathValue = (data, path) => {
  if (!data || typeof data !== "object") return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const value = getPathValue(item, path);
      if (value !== null) return value;
    }
    return null;
  }

  const key = Object.keys(data).find((itemKey) => itemKey.toLowerCase() === path[0].toLowerCase());
  if (key) {
    if (path.length === 1) return data[key];
    return getPathValue(data[key], path.slice(1));
  }

  for (const value of Object.values(data)) {
    const nestedValue = getPathValue(value, path);
    if (nestedValue !== null) return nestedValue;
  }

  return null;
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const normalizedValue = String(value).replace(/[R$\s]/g, "");
  const amount = typeof value === "number"
    ? value
    : Number(
      normalizedValue.includes(",")
        ? normalizedValue.replace(/\./g, "").replace(",", ".")
        : normalizedValue
    );

  return Number.isFinite(amount)
    ? amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : formatValue(value);
};

const formatDate = (value) => {
  if (value === null || value === undefined || value === "") return "-";

  const isoDate = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatValue(value);

  return date.toLocaleDateString("pt-BR");
};

const findInstallments = (data) => {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data)) {
    for (const item of data) {
      const installments = findInstallments(item);
      if (installments.length) return installments;
    }
    return [];
  }

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value) && /parcelas|installments/i.test(key)) return value;
    const installments = findInstallments(value);
    if (installments.length) return installments;
  }

  return [];
};

const getInstallments = (statement) => {
  const currentInstallments = getPathValue(statement, ["Parcelas", "Current"]);
  if (Array.isArray(currentInstallments)) return currentInstallments;
  if (currentInstallments && typeof currentInstallments === "object") return [currentInstallments];
  return findInstallments(statement);
};

function PlanDataSection({ statement }) {
  const fields = [
    ["Nome do Cliente", () => formatValue(getPathValue(statement, ["Nome_titular"]))],
    ["Início da Vigência", () => formatDate(getPathValue(statement, ["Vigencia", "Inicio"]))],
    ["Documento", () => formatValue(getPathValue(statement, ["Documento_titular"]))],
    ["Prazo de Vigência", () => {
      const term = getPathValue(statement, ["Produto", "Prazo_meses"]);
      return term === null ? "-" : `${term} meses`;
    }],
    ["Prazo de Carência Resgate", () => "6 meses"],
    ["Processo SUSEP", () => formatValue(getPathValue(statement, ["Numero_processo_susep"]))],
    ["Valor do Pagamento", () => formatCurrency(getPathValue(statement, ["Contribuicao"]))],
    ["Status", () => formatValue(getPathValue(statement, ["Status"]))],
    ["Periodicidade do pagamento", () => formatValue(getPathValue(statement, ["Produto", "Periodicidade"]))],
    ["Número do título", () => formatValue(getPathValue(statement, ["Numero_titulo"]))],
  ];

  return (
    <section className={styles.statementSection}>
      <h2>Dados do Plano</h2>
      <div className={styles.statementGrid}>
        {fields.map(([label, getValue]) => (
          <div className={styles.field} key={label}>
            <span>{label}</span>
            <strong>{getValue()}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function RedemptionSection({ statement }) {
  const fields = [
    ["Valor Base para Cálculo de Resgate*", () => formatCurrency(getPathValue(statement, ["Reserva_resumo", "Valor_resgate_estimado"]))],
    ["Data da Posição", () => formatDate(getPathValue(statement, ["Reserva_resumo", "Posicao_em"]))],
    ["Valor Resgate Previsto no Final", () => formatCurrency(getPathValue(statement, ["Data", "Current", "Valor_total_resgate"]))],
  ];

  return (
    <section className={styles.statementSection}>
      <h2>Resgate</h2>
      <div className={styles.statementGrid}>
        {fields.map(([label, getValue]) => (
          <div className={styles.field} key={label}>
            <span>{label}</span>
            <strong>{getValue()}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function InstallmentsTable({ installments }) {
  return (
    <section className={styles.statementSection}>
      <h2>Parcelas</h2>
      <div className={styles.tableWrapper}>
        <table className={styles.installmentsTable}>
          <thead>
            <tr>
              <th>Parcela</th>
              <th>Status</th>
              <th>Data de Pagamento</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {installments.length ? installments.map((installment, index) => (
              <tr key={index}>
                <td>{formatValue(getFieldValue(installment, ["Numero_parcela"]))}</td>
                <td>{formatValue(getFieldValue(installment, ["Status_cobranca"]))}</td>
                <td>{formatDate(getFieldValue(installment, ["Data_pagamento"]))}</td>
                <td>{formatCurrency(getFieldValue(installment, ["Valor_total_cobranca"]))}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className={styles.noInstallments}>Nenhuma parcela encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatementSection({ title, data }) {
  if (Array.isArray(data)) {
    if (/parcelas|installments/i.test(title) && data.every((item) => typeof item === "object" && item !== null)) {
      return <InstallmentsTable installments={data} />;
    }

    return (
      <section className={styles.statementSection}>
        <h2>{formatLabel(title)}</h2>
        <div className={styles.statementList}>
          {data.length ? data.map((item, index) => (
            typeof item === "object" && item !== null ? (
              <StatementSection key={index} title={`Registro ${index + 1}`} data={item} />
            ) : (
              <p className={styles.field} key={index}>{formatValue(item)}</p>
            )
          )) : <p className={styles.emptyValue}>Nenhum registro encontrado.</p>}
        </div>
      </section>
    );
  }

  if (typeof data === "object" && data !== null) {
    const fields = Object.entries(data);
    return (
      <section className={styles.statementSection}>
        <h2>{formatLabel(title)}</h2>
        <div className={styles.statementGrid}>
          {fields.map(([key, value]) =>
            typeof value === "object" && value !== null ? (
              <div className={styles.nestedSection} key={key}>
                <StatementSection title={key} data={value} />
              </div>
            ) : (
              <div className={styles.field} key={key}>
                <span>{formatLabel(key)}</span>
                <strong>{formatValue(value)}</strong>
              </div>
            )
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.statementSection}>
      <h2>{formatLabel(title)}</h2>
      <p className={styles.field}>{formatValue(data)}</p>
    </section>
  );
}

export default function Extrato() {
  const [searchParams] = useSearchParams();
  const [documentNumber, setDocumentNumber] = useState("");
  const [title, setTitle] = useState("");
  const [isLoadingPartner, setIsLoadingPartner] = useState(true);
  const [statement, setStatement] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [partnerLogo, setPartnerLogo] = useState("");
  const cnpjPartner = searchParams.get("CNPJPartner") || "";
  const canSearch = Boolean(documentNumber.trim() || title.trim());

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Extrato de Proposta";

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
        if (data?.logos?.positive) {
          setPartnerLogo(data.logos.positive);
        }
      } catch (error) {
        console.error("Erro ao carregar parceiro:", error);
      } finally {
        setIsLoadingPartner(false);
      }
    };

    loadPartner();
  }, [cnpjPartner]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSearch) return;

    setIsSearching(true);
    setSearchError("");
    setStatement(null);

    try {
      const response = await api.get("/api/billing-cap/v1/titles/statement", {
        params: {
          cpf: documentNumber.replace(/\D/g, ""),
          chaveTitulo: title.trim(),
        },
        headers: {
          CNPJ: cnpjPartner || getActivePartnerCnpj(),
        },
      });
      setStatement(response.data?.data ?? response.data);
    } catch (error) {
      console.error("Erro ao consultar extrato de propostas:", error);
      setSearchError("Não foi possível consultar o extrato. Tente novamente.");
    } finally {
      setIsSearching(false);
    }
  };

  if (isLoadingPartner) {
    return (
      <>
        <PartnerHeader />
        <main className={styles.pageContainer}>
          <section className={styles.contentCard}>
            <p className={styles.loading}>Carregando informações...</p>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <PartnerHeader />
      <main className={styles.pageContainer}>
        <header className={styles.pageIntro}>
          <p className={styles.eyebrow}>Consulta de títulos</p>
          <h1>Extrato de Propostas</h1>
          <p>Consulte os dados, pagamentos e condições de resgate de um título.</p>
        </header>
        <section className={styles.contentCard}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <label>
              CPF/CNPJ
              <input
                type="text"
                value={documentNumber}
                onChange={(event) => setDocumentNumber(event.target.value)}
                placeholder="Informe o CPF ou CNPJ"
              />
            </label>

            <label>
              Título
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Informe o número do título"
              />
            </label>

            <button type="submit" disabled={!canSearch || isSearching}>
              {isSearching ? "Pesquisando..." : "Pesquisar"}
            </button>
          </form>

          {searchError && <p className={styles.errorMessage}>{searchError}</p>}

          {statement !== null && (
            <section className={styles.printArea}>
              <div className={styles.printHeader}>
                <img
                  src={partnerLogo || "/images/logo-default.svg"}
                  alt="Logo do parceiro"
                  className={styles.partnerLogo}
                />
              </div>
              <div className={styles.documentBody}>
                <div className={styles.documentTitle}>
                  <div>
                    <h2>Extrato de Propostas</h2>
                    <span>Consulta realizada em {new Date().toLocaleDateString("pt-BR")}</span>
                  </div>
                  <button type="button" className={styles.printButton} onClick={() => window.print()}>
                    Imprimir
                  </button>
                </div>
                <PlanDataSection statement={statement} />
                <InstallmentsTable installments={getInstallments(statement)} />
                <RedemptionSection statement={statement} />
                <footer className={styles.documentFooter}>
                  * O valor informado poderá estar sujeito a deduções, nos termos previstos nas Condições Gerais do produto.
                </footer>
              </div>
            </section>
          )}
        </section>
      </main>
    </>
  );
}
