import styles from "./Modal.module.css";
import { Icon } from "mag-design-system";

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <header className={styles.modalHeader}>
          <h2>{title}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <Icon.Close size={20} />
          </button>
        </header>
        <div className={styles.modalBody}>
          {children}
        </div>
      </div>
    </div>
  );
}