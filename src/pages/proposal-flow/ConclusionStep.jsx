import styles from "../ProposalFlow.module.css";

export default function ConclusionStep({ onDownloadProposal, onNewProposal, proposalNumber }) {
  return (
    <div className={styles.stepContent}>
      <div className={styles.cardHeader} style={{ textAlign: "center" }}>
        <h2>Proposta Gerada com Sucesso! ✅</h2>
        <p>A proposta foi registrada na MAG. O cliente receberá as instruções para concluir a contratação.</p>
      </div>
      <div className={styles.conclusionContainer}>
        <span className={styles.conclusionSubTitle}>Geração da proposta</span>
        <div className={styles.proposalBox}>
          <span className={styles.proposalLabelText}>Número da proposta gerada:</span>
          <strong className={styles.proposalNumberText} style={{ fontSize: "1.6rem", color: "var(--color-primary, #003366)" }}>
            {proposalNumber || "—"}
          </strong>
          <button type="button" onClick={onDownloadProposal} className={styles.downloadProposalBtn}>
            ⬇ Baixar proposta
          </button>
        </div>
        <button type="button" onClick={onNewProposal} className={styles.newProposalBtn}>
          + Nova Proposta
        </button>
      </div>
    </div>
  );
}
