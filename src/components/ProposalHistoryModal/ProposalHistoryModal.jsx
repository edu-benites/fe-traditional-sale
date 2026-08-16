import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAllProposals } from "../../services/proposalService";
import Modal from "../Modal/Modal";
import styles from "./ProposalHistoryModal.module.css";

const STATUS_LABELS = {
  completo: { label: "Concluída", color: "#15803d", bg: "#dcfce7" },
  pendente: { label: "Pendente", color: "#b45309", bg: "#fef3c7" },
  em_andamento: { label: "Em andamento", color: "#1d4ed8", bg: "#dbeafe" },
};

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

function maskCpf(doc) {
  if (!doc) return "—";
  const digits = doc.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return doc;
}

export default function ProposalHistoryModal() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadProposals = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllProposals();
      setProposals(data || []);
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
    alert(
      `Baixando PDF da proposta${proposal.proposal_number ? ` nº ${proposal.proposal_number}` : ""}...`
    );
  };

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
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Produto</th>
                <th>CPF / CNPJ</th>
                <th>Status</th>
                <th>Nº Proposta</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal) => {
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
                    <td className={styles.productCell}>
                      {proposal.product_name || "—"}
                    </td>
                    <td className={styles.docCell}>
                      {maskCpf(proposal.document_number)}
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
      )}
    </Modal>
  );
}
