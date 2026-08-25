const BRANDING_KEY = "@Mag:partnerBranding";
export const PARTNER_BRANDING_EVENT = "partnerBrandingUpdated";

export function normalizePartnerCnpj(cnpj) {
  return String(cnpj || "").replace(/\D/g, "");
}

export function savePartnerBranding(cnpj, partnerData) {
  const normalizedCnpj = normalizePartnerCnpj(cnpj);
  if (!normalizedCnpj) return;

  const branding = {
    cnpj: normalizedCnpj,
    logo: partnerData?.logos?.negative || "",
    name: partnerData?.legalName || "Parceiro",
    primaryColour: partnerData?.settings?.primaryColour || "",
  };

  // sessionStorage is scoped to the browser tab, preventing cross-tab partner branding.
  sessionStorage.setItem(BRANDING_KEY, JSON.stringify(branding));
  sessionStorage.setItem("@Mag:cnpj", normalizedCnpj);
  sessionStorage.setItem("@Mag:partnerLogo", branding.logo);
  sessionStorage.setItem("@Mag:partnerName", branding.name);
  sessionStorage.setItem("@Mag:primaryColour", branding.primaryColour);

  if (branding.primaryColour) {
    document.documentElement.style.setProperty("--color-primary", branding.primaryColour);
  }

  window.dispatchEvent(new Event(PARTNER_BRANDING_EVENT));
}

export function getActivePartnerBranding() {
  const activeCnpj = getActivePartnerCnpj();

  try {
    const branding = JSON.parse(sessionStorage.getItem(BRANDING_KEY) || "null");
    return branding?.cnpj === activeCnpj ? branding : null;
  } catch {
    return null;
  }
}

export function getActivePartnerCnpj() {
  return normalizePartnerCnpj(sessionStorage.getItem("@Mag:cnpj"));
}

export function getActivePartnerName() {
  return getActivePartnerBranding()?.name || "";
}
