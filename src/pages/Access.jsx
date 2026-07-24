import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPartners } from "../services/partnerService";
import { api } from "../services/api";
import styles from "./Access.module.css";

export default function Access() {
  const navigate = useNavigate();

  // Form states
  const [hashLead, setHashLead] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [externalId, setExternalId] = useState("");
  const [producerId, setProducerId] = useState("");
  const [susep, setSusep] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Business rules for display and validation
  const showBrokerFields = cnpj.length >= 14;
  const isFormValid = cnpj.length >= 14 && externalId !== "" && susep !== "";

  const handleAccess = async () => {
    if (!isFormValid) return;

    setIsLoading(true);

    try {
      // Recebe o JSON direto da API
      const partnerData = await getPartners(cnpj);

      // Aplica a cor primária dinâmica vinda de settings.primaryColour
      document.documentElement.style.setProperty(
        "--color-primary",
        partnerData.settings.primaryColour,
      );

      // Salva os dados de branding e o CNPJ no localStorage
      // Dentro do handleAccess em Access.jsx:
      localStorage.setItem("@Mag:partnerLogo", partnerData.logos.negative);
      localStorage.setItem("@Mag:partnerName", partnerData.legalName);
      localStorage.setItem("@Mag:cnpj", cnpj);
      localStorage.setItem("@Mag:primaryColour", partnerData.settings.primaryColour);

      // Configura o header padrão e redireciona
      api.defaults.headers.common["cnpj"] = cnpj;
      navigate("/products");
    } catch (error) {
      console.error("Error fetching partner details:", error);
      alert("Could not validate partner. Please check the CNPJ.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <img
          src="/images/logo-default.svg"
          alt="MAG Capitalização"
          className={styles.logo}
        />

        <input
          type="text"
          placeholder="Cole o hash lead aqui"
          value={hashLead}
          onChange={(e) => setHashLead(e.target.value)}
        />

        <input
          type="text"
          placeholder="Digite o CNPJ do parceiro"
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          maxLength={18}
        />

        {showBrokerFields && (
          <div className={styles.brokerSection}>
            <p>Dados do Corretor</p>
            <div className={styles.row}>
              <input
                type="text"
                placeholder="ID externo"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
              />
              <input
                type="text"
                placeholder="ID Produtor"
                value={producerId}
                onChange={(e) => setProducerId(e.target.value)}
              />
            </div>
            <input
              type="text"
              placeholder="SUSEP do corretor"
              value={susep}
              onChange={(e) => setSusep(e.target.value)}
            />
          </div>
        )}

        <button
          onClick={handleAccess}
          disabled={!isFormValid || isLoading}
          className={isFormValid ? styles.btnActive : styles.btnDisabled}
        >
          {isLoading ? "Carregando..." : "Acessar"}
        </button>
      </div>
    </div>
  );
}
