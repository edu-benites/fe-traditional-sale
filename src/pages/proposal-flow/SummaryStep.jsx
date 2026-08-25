import styles from "../ProposalFlow.module.css";

export default function SummaryStep({ children }) {
  return (
    <div className={styles.stepContent}>
      <div className={styles.cardHeader}>
        <h2>Resumo da contratação</h2>
        <p>Confira todas as informações antes de seguir para a assinatura.</p>
      </div>
      {children}
    </div>
  );
}
