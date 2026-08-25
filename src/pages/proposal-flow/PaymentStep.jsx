import styles from "../ProposalFlow.module.css";

export default function PaymentStep({
  banks,
  banksError,
  clientType,
  documentNumber,
  getBankValue,
  isLoadingBanks,
  onPaymentChange,
  paymentData,
}) {
  return (
    <div className={styles.stepContent}>
      <div className={styles.cardHeader}>
        <h2>Forma de pagamento</h2>
        <p>Preencha com as informações do cliente.</p>
      </div>

      <div className={styles.formGroup} style={{ backgroundColor: "#f8fafc", padding: "12px", borderRadius: "6px" }}>
        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
          {clientType === "juridica" ? "CNPJ do titular" : "CPF do titular"}
        </span>
        <strong style={{ fontSize: "1rem", color: "var(--color-primary, #003366)", marginTop: "2px" }}>
          {documentNumber}
        </strong>
      </div>

      <div className={styles.formGroup}>
        <label>Banco *</label>
        <select name="banco" value={paymentData.banco} onChange={onPaymentChange} className={styles.textInput} disabled={isLoadingBanks || banks.length === 0}>
          <option value="">{isLoadingBanks ? "Carregando bancos..." : "Selecione o banco"}</option>
          {banks.map((bank) => (
            <option key={bank.id} value={getBankValue(bank)}>{getBankValue(bank)}</option>
          ))}
        </select>
        {banksError && <span className={styles.errorText}>{banksError}</span>}
      </div>

      <div className={styles.gridRowAgencyAccount}>
        <div className={styles.formGroup}>
          <label>Agência *</label>
          <input type="text" name="agencia" autoComplete="off" value={paymentData.agencia} onChange={onPaymentChange} className={styles.textInput} />
        </div>
        <div className={styles.formGroup}>
          <label>Dígito agência</label>
          <input type="text" name="digitoAgencia" autoComplete="off" value={paymentData.digitoAgencia} onChange={onPaymentChange} placeholder="Dígito" className={styles.textInput} />
        </div>
        <div className={styles.formGroup}>
          <label>Conta corrente *</label>
          <input type="text" name="contaCorrente" autoComplete="off" value={paymentData.contaCorrente} onChange={onPaymentChange} className={styles.textInput} />
        </div>
      </div>
    </div>
  );
}
