import styles from "./DevAutoFillButton.module.css";

export default function DevAutoFillButton({ currentStep, isRunning, onRun }) {
  if (!import.meta.env.DEV) return null;

  const isSupported = currentStep >= 1 && currentStep <= 4;

  return (
    <button
      type="button"
      className={styles.button}
      onClick={onRun}
      disabled={!isSupported || isRunning}
      title={isSupported ? "Preenche e avança a etapa atual" : "A automação não executa a etapa de assinatura"}
    >
      {isRunning ? "Testando etapa..." : "Testar etapa"}
    </button>
  );
}
