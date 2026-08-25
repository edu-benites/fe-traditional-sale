import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAllProposals } from "../../services/proposalService";
import { getActivePartnerCnpj } from "../../services/partnerBranding";
import Modal from "../Modal/Modal";
import styles from "./ProposalHistoryModal.module.css";

const STATUS_LABELS = {
  completo: { label: "Concluída", color: "#15803d", bg: "#dcfce7" },
  pendente: { label: "Pendente", color: "#b45309", bg: "#fef3c7" },
  em_andamento: { label: "Em andamento", color: "#1d4ed8", bg: "#dbeafe" },
};
const PAGE_SIZE = 5;

function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function maskDocument(documentNumber) {
  if (!documentNumber) return "—";

  const digits = documentNumber.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  return documentNumber;
}

function normalizeCnpj(cnpj) {
  return (cnpj || "").replace(/\D/g, "");
}

export default function ProposalHistoryModal() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("todos");

  const loadProposals = useCallback(async () => {
    const partnerCnpj = getActivePartnerCnpj();

    if (!partnerCnpj) {
      setProposals([]);
      setCurrentPage(1);
      return;
    }

    setIsLoading(true);
    try {
      const data = await getAllProposals();
      setProposals(
        (data || [])
          .filter(
            (proposal) =>
              normalizeCnpj(proposal.partner_cnpj) === partnerCnpj &&
              (proposal.status === "completo" ||
                (proposal.status === "pendente" && Number(proposal.current_step) >= 2))
          )
          .sort(
            (first, second) =>
              (new Date(second.start_date).getTime() || 0) -
              (new Date(first.start_date).getTime() || 0)
          )
      );
      setCurrentPage(1);
    } catch (e) {
      console.error("[ProposalHistoryModal] Erro ao carregar propostas:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Escuta o evento global disparado pelo Header
  useEffect(() => {
    const handler = () => {
      setIsOpen(true);
      loadProposals();
    };
    window.addEventListener("openProposalHistory", handler);
    return () => window.removeEventListener("openProposalHistory", handler);
  }, [loadProposals]);

  const handleContinue = (proposal) => {
    setIsOpen(false);
    navigate(`/proposalflow?id=${proposal.id}`);
  };

  const handleDownload = (proposal) => {
    window.open(`/proposal-pdf/${proposal.proposal_number}`, '_blank');
  };

  const filteredProposals = proposals.filter((proposal) => {
    if (statusFilter === "todos") return true;
    if (statusFilter === "concluida") return proposal.status === "completo";
    return proposal.status === "pendente";
  });
  const totalPages = Math.ceil(filteredProposals.length / PAGE_SIZE);
  const displayedProposals = filteredProposals.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Histórico de Propostas"
      maxWidth="900px"
    >
      {isLoading ? (
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner}></div>
          <span>Carregando propostas...</span>
        </div>
      ) : proposals.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📋</span>
          <p>Nenhuma proposta encontrada.</p>
        </div>
      ) : (
        <>
        <div className={styles.filterBar}>
          <label htmlFor="proposal-status-filter">Status</label>
          <select
            id="proposal-status-filter"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="todos">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="concluida">Concluída</option>
          </select>
        </div>
        {filteredProposals.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Nenhuma proposta encontrada para este status.</p>
          </div>
        ) : (
          <>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Documento</th>
                <th>Status</th>
                <th>Nº Proposta</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {displayedProposals.map((proposal) => {
                const isCompleted = proposal.status === "completo";
                const statusInfo =
                  STATUS_LABELS[proposal.status] || STATUS_LABELS["pendente"];

                return (
                  <tr key={proposal.id} className={styles.row}>
                    <td className={styles.dateCell}>
                      <div className={styles.dateMain}>
                        {formatDateTime(proposal.start_date)}
                      </div>
                      {isCompleted && proposal.finish_date && (
                        <div className={styles.dateSub}>
                          Concluída: {formatDateTime(proposal.finish_date)}
                        </div>
                      )}
                    </td>
                    <td className={styles.docCell}>
                      {maskDocument(proposal.document_number)}
                    </td>
                    <td>
                      <span
                        className={styles.statusBadge}
                        style={{
                          color: statusInfo.color,
                          background: statusInfo.bg,
                        }}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className={styles.numberCell}>
                      {proposal.proposal_number || "—"}
                    </td>
                    <td>
                      {isCompleted ? (
                        <button
                          type="button"
                          className={styles.downloadBtn}
                          onClick={() => handleDownload(proposal)}
                        >
                          ⬇ Baixar PDF
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.continueBtn}
                          onClick={() => handleContinue(proposal)}
                        >
                          ▶ Continuar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={styles.mobileList}>
          {displayedProposals.map((proposal) => {
            const isCompleted = proposal.status === "completo";
            const statusInfo =
              STATUS_LABELS[proposal.status] || STATUS_LABELS["pendente"];

            return (
              <article className={styles.proposalCard} key={proposal.id}>
                <header className={styles.cardHeader}>
                  <div>
                    <span className={styles.cardLabel}>Produto</span>
                    <strong>{proposal.product_name || "Produto não informado"}</strong>
                  </div>
                  <span
                    className={styles.statusBadge}
                    style={{ color: statusInfo.color, background: statusInfo.bg }}
                  >
                    {statusInfo.label}
                  </span>
                </header>
                <dl className={styles.cardDetails}>
                  <div>
                    <dt>Iniciada em</dt>
                    <dd>{formatDateTime(proposal.start_date)}</dd>
                  </div>
                  <div>
                    <dt>Nº da proposta</dt>
                    <dd className={styles.numberCell}>{proposal.proposal_number || "—"}</dd>
                  </div>
                  {isCompleted && proposal.finish_date && (
                    <div>
                      <dt>Concluída em</dt>
                      <dd>{formatDateTime(proposal.finish_date)}</dd>
                    </div>
                  )}
                </dl>
                {isCompleted ? (
                  <button
                    type="button"
                    className={styles.downloadBtn}
                    onClick={() => handleDownload(proposal)}
                  >
                    Baixar PDF
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.continueBtn}
                    onClick={() => handleContinue(proposal)}
                  >
                    Continuar proposta
                  </button>
                )}
              </article>
            );
          })}
        </div>
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <span>
              {(currentPage - 1) * PAGE_SIZE + 1} a {Math.min(currentPage * PAGE_SIZE, filteredProposals.length)} de {filteredProposals.length}
            </span>
            <div className={styles.paginationControls}>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                aria-label="Página anterior"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  type="button"
                  key={page}
                  className={page === currentPage ? styles.activePage : ""}
                  onClick={() => setCurrentPage(page)}
                  aria-label={`Página ${page}`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                aria-label="Próxima página"
              >
                &gt;
              </button>
            </div>
          </div>
        )}
          </>
        )}
        </>
      )}
    </Modal>
  );
}
