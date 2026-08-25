import styles from "../ProposalFlow.module.css";

export default function IdentificationStep({
  clientType,
  documentError,
  documentNumber,
  onClientTypeChange,
  onDocumentChange,
}) {
  return (
    <div className={styles.stepContent}>
      <div className={styles.cardHeader}>
        <h2>Identificação do cliente</h2>
        <p>Com o CPF/CNPJ vamos descobrir se é um novo cliente ou não.</p>
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
              onChange={() => onClientTypeChange("fisica")}
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
              onChange={() => onClientTypeChange("juridica")}
            />
            <span>Pessoa jurídica</span>
          </label>
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label>{clientType === "fisica" ? "CPF" : "CNPJ"}</label>
        <input
          type="text"
          name="documentNumber"
          placeholder={clientType === "fisica" ? "000.000.000-00" : "AA.AAA.AAA/AAAA-99"}
          value={documentNumber}
          onChange={onDocumentChange}
          className={styles.textInput}
          aria-invalid={Boolean(documentError)}
          aria-describedby={documentError ? "document-error" : undefined}
        />
        {documentError && (
          <span id="document-error" className={styles.errorText}>
            {documentError}
          </span>
        )}
      </div>
    </div>
  );
}
