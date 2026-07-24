import styles from './Header.module.css';

export default function Header() {
  // Recupera os dados salvos no localStorage na tela de Access
  const partnerLogo = localStorage.getItem('@Mag:partnerLogo');
  const partnerName = localStorage.getItem('@Mag:partnerName');

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {partnerLogo ? (
          <img src={partnerLogo} alt={partnerName || 'Logo Parceiro'} className={styles.logo} />
        ) : (
          <h2 className={styles.fallbackTitle}>{partnerName || 'MAG Capitalização'}</h2>
        )}
        <div className={styles.history}>
          <span>Histórico de Cotações</span>
        </div>
      </div>
    </header>
  );
}