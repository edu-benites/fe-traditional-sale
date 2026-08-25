import { useEffect } from "react";
import styles from "./Modal.module.css";

export default function Modal({ isOpen, onClose, title, maxWidth = "600px", children }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modalContainer}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <h2>{title}</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </header>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}
