import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPartners } from "../services/partnerService";
import { savePartnerBranding } from "../services/partnerBranding";
import { createProposal, updateProposal } from "../services/proposalService";
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
  const [leadMessage, setLeadMessage] = useState("");
  const isLookingUpLead = useRef(false);

  // Business rules for display and validation
  const showBrokerFields = cnpj.length >= 14;
  const isFormValid = cnpj.length >= 14 && externalId !== "" && susep !== "";

  const getLeadOffer = (lead) => {
    const generalInfo = lead?.generalInfo || {};
    const product = lead?.products?.[0] || {};

    return {
      productId: generalInfo.offerId || product.productId || product.id || "",
      offerCode: generalInfo.offerCode || product.offerCode || product.code || "",
      productName: product.productName || product.name || product.description || generalInfo.offerName || "",
      offerName: generalInfo.offerName || product.offerName || product.name || "",
      unitValue: Number(generalInfo.totalContribution || product.totalContribution || product.minimumValue) || 0,
      monthTerm: Number(product.monthTerm || product.termMonths || product.months) || 0,
    };
  };

  const handleLeadLookup = async () => {
    const hash = hashLead.trim();
    if (!hash || isLookingUpLead.current) return;

    isLookingUpLead.current = true;
    setIsLoading(true);
    setLeadMessage("");

    try {
      const response = await api.get(`/api/sales-cap/v1/lead/${encodeURIComponent(hash)}`);
      const lead = response.data?.data || response.data;
      const generalInfo = lead?.generalInfo;
      const vendor = lead?.commercialDetails?.vendors?.find((item) => item.mainVendor) ||
        lead?.commercialDetails?.vendors?.[0] || {};
      const partnerCnpj = String(
        generalInfo?.partnerVendorId || generalInfo?.businessPartnerDocument || ""
      ).replace(/\D/g, "");

      if (!generalInfo?.leadId || !partnerCnpj) {
        throw new Error("Lead sem parceiro vinculado.");
      }

      setCnpj(partnerCnpj);
      setExternalId(vendor.externalId || "");
      setProducerId(vendor.producerId || "");
      setSusep(vendor.susepId || "");

      const partnerData = await getPartners(partnerCnpj);
      savePartnerBranding(partnerCnpj, partnerData);
      sessionStorage.setItem("@Mag:brokerExternalId", vendor.externalId || "");
      sessionStorage.setItem("@Mag:brokerProducerId", vendor.producerId || "");
      sessionStorage.setItem("@Mag:brokerSusep", vendor.susepId || "");

      const policyHolder = lead?.policyHolders?.[0] || {};
      const personDetails = policyHolder.personDetails || {};
      const address = policyHolder.addresses?.[0] || {};
      const email = policyHolder.emails?.find((item) => item.main)?.email || policyHolder.emails?.[0]?.email || "";
      const telephone = policyHolder.telephones?.find((item) => item.main) || policyHolder.telephones?.[0] || {};
      const clientType = policyHolder.typePerson === "pj" ? "juridica" : "fisica";
      const clientDocument = personDetails.document || generalInfo.selfPolicyHolderDocumentId || "";
      const leadFormData = clientType === "juridica"
        ? {
            razaoSocial: policyHolder.legalPerson?.legalName || "",
            nomeFantasia: policyHolder.legalPerson?.commercialName || "",
            ramoAtividade: policyHolder.legalPerson?.businessActivity || "",
            representanteNome: personDetails.name || "",
            representanteEmail: email,
          }
        : {
            nomeCompleto: personDetails.name || generalInfo.selfPolicyHolderName || "",
            sexo: personDetails.sex || "",
            dataNascimento: personDetails.birthday || "",
            email,
            celular1: [telephone.nationalDestinationCode, telephone.number].filter(Boolean).join(" "),
            estadoCivil: personDetails.civilStatus || "",
            nacionalidade: personDetails.nacionality || "Brasileira(o)",
            profissao: personDetails.occupation?.description || "",
          };

      const leadDraft = {
        clientType,
        documentNumber: clientDocument,
        formData: leadFormData,
      };
      const offer = getLeadOffer(lead);

      if (!offer.productId || !offer.offerCode) {
        sessionStorage.setItem("@Mag:leadDraft", JSON.stringify(leadDraft));
        navigate("/products");
        return;
      }

      const proposal = await createProposal({
        ...offer,
        quantity: 1,
        totalValue: offer.unitValue,
        rescueValue: 0,
        partnerCnpj,
        partnerName: partnerData?.legalName || "",
      });
      await updateProposal(proposal.id, {
        client_type: leadDraft.clientType,
        document_number: leadDraft.documentNumber,
        form_data: leadDraft.formData,
      });

      navigate(`/proposalflow?id=${proposal.id}`, { state: { proposalId: proposal.id } });
    } catch (error) {
      console.error("Erro ao consultar lead:", error);
      setLeadMessage("Não foi possível localizar um lead válido para este hash.");
    } finally {
      isLookingUpLead.current = false;
      setIsLoading(false);
    }
  };

  const handleAccess = async () => {
    if (hashLead.trim()) {
      await handleLeadLookup();
      return;
    }

    if (!isFormValid) return;

    setIsLoading(true);

    try {
      // Recebe o JSON direto da API
      const partnerData = await getPartners(cnpj);

      // Persiste branding e CNPJ como um único registro para evitar marcas cruzadas.
      savePartnerBranding(cnpj, partnerData);

      // Mantém os dados do corretor isolados na aba atual.
      sessionStorage.setItem("@Mag:brokerExternalId", externalId);
      sessionStorage.setItem("@Mag:brokerProducerId", producerId);
      sessionStorage.setItem("@Mag:brokerSusep", susep);

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
    <main className={styles.container}>
      <section className={styles.card}>
        <header className={styles.intro}>
          <h1 className={styles.title}>Venda assistida</h1>
          <img
            src="/images/logo-default.svg"
            alt="MAG Capitalização"
            className={styles.logo}
          />
        </header>

        <section className={styles.leadSection}>
          <div className={styles.sectionHeading}>
            <span>1</span>
            <div>
              <h2>Tenho um Lead</h2>
              <p>Localize o atendimento por meio do hash recebido.</p>
            </div>
          </div>
          <label className={styles.field}>
            Hash do Lead
            <input
              type="text"
              placeholder="Cole o hash do Lead aqui"
              value={hashLead}
              onChange={(e) => {
                setHashLead(e.target.value);
                setLeadMessage("");
              }}
              onBlur={handleLeadLookup}
              aria-describedby={leadMessage ? "lead-message" : undefined}
            />
          </label>
          {leadMessage && <p id="lead-message" className={styles.leadMessage}>{leadMessage}</p>}
        </section>

        <div className={styles.divider}><span>ou acesse manualmente</span></div>

        <section className={styles.manualSection}>
          <div className={styles.sectionHeading}>
            <span>2</span>
            <div>
              <h2>Dados do parceiro</h2>
              <p>Informe as credenciais para escolher uma oferta.</p>
            </div>
          </div>
          <label className={styles.field}>
            CNPJ do parceiro
            <input
              type="text"
              placeholder="Digite o CNPJ do parceiro"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              maxLength={18}
            />
          </label>

          {showBrokerFields && (
            <div className={styles.brokerSection}>
              <p>Dados do corretor</p>
              <div className={styles.row}>
                <label className={styles.field}>
                  ID externo
                  <input
                    type="text"
                    placeholder="Informe o ID"
                    value={externalId}
                    onChange={(e) => setExternalId(e.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  ID produtor
                  <input
                    type="text"
                    placeholder="Informe o ID"
                    value={producerId}
                    onChange={(e) => setProducerId(e.target.value)}
                  />
                </label>
              </div>
              <label className={styles.field}>
                SUSEP do corretor
                <input
                  type="text"
                  placeholder="Informe o registro SUSEP"
                  value={susep}
                  onChange={(e) => setSusep(e.target.value)}
                />
              </label>
            </div>
          )}
        </section>

        <button
          onClick={handleAccess}
          disabled={(!isFormValid && !hashLead.trim()) || isLoading}
          className={isFormValid || hashLead.trim() ? styles.btnActive : styles.btnDisabled}
        >
          {isLoading ? "Consultando dados..." : "Continuar"}
        </button>
      </section>
    </main>
  );
}
