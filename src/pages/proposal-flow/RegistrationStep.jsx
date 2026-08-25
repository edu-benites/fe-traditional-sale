import styles from "../ProposalFlow.module.css";

export default function RegistrationStep({ clientType, registrationError, children }) {
  return (
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
          {clientType === "juridica" ? "Pessoa jurídica" : "Pessoa física"}
        </span>
        <h2 style={{ margin: "2px 0 4px 0" }}>Ficha de cadastro</h2>
        <p>
          {clientType === "juridica"
            ? "Preencha com as informações da empresa e dos sócios."
            : "Preencha com as informações do cliente."}
        </p>
      </div>

      {registrationError && (
        <div className={styles.registrationError} role="alert">
          {registrationError}
        </div>
      )}

      {children}
    </div>
  );
}
