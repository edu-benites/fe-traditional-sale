import styles from "../ProposalFlow.module.css";

export default function SignatureStep({ children, isTokenSent, tokenMethod }) {
  return (
    <div className={styles.stepContent}>
      <div className={styles.cardHeader}>
        <h2>Assinatura por token</h2>
        <p>
          {!isTokenSent
            ? "Selecione o formato para que seu cliente receba o token de assinatura virtual da proposta:"
            : `Código de autenticação Enviado por ${tokenMethod === "email" ? "E-MAIL" : "SMS"}`}
        </p>
      </div>
      {children}
    </div>
  );
}
