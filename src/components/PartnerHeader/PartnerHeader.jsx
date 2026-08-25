import { useEffect, useState } from "react";
import { getPartners } from "../../services/partnerService";
import {
  getActivePartnerBranding,
  getActivePartnerCnpj,
  PARTNER_BRANDING_EVENT,
  savePartnerBranding,
} from "../../services/partnerBranding";
import styles from "./PartnerHeader.module.css";

export default function PartnerHeader() {
  const [branding, setBranding] = useState(getActivePartnerBranding);
  const partnerLogo = branding?.logo || "";
  const partnerName = branding?.name || "Parceiro";

  useEffect(() => {
    const syncBranding = () => setBranding(getActivePartnerBranding());
    const cnpj = getActivePartnerCnpj();
    let isCurrent = true;

    window.addEventListener(PARTNER_BRANDING_EVENT, syncBranding);
    window.addEventListener("storage", syncBranding);

    if (branding?.primaryColour) {
      document.documentElement.style.setProperty("--color-primary", branding.primaryColour);
    } else {
      document.documentElement.style.removeProperty("--color-primary");
    }

    if (!branding && cnpj) {
      getPartners(cnpj)
        .then((partnerData) => {
          if (isCurrent && getActivePartnerCnpj() === cnpj) {
            savePartnerBranding(cnpj, partnerData);
          }
        })
        .catch((error) => console.error("Erro ao recuperar a marca do parceiro:", error));
    }

    return () => {
      isCurrent = false;
      window.removeEventListener(PARTNER_BRANDING_EVENT, syncBranding);
      window.removeEventListener("storage", syncBranding);
    };
  }, [branding]);

  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <div className={styles.brand}>
          {partnerLogo ? <img src={partnerLogo} alt={partnerName} /> : <span>{partnerName}</span>}
        </div>
      </div>
    </header>
  );
}
