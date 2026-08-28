import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PartnerHeader from "../components/PartnerHeader/PartnerHeader";
import { getActivePartnerCnpj, getActivePartnerName } from "../services/partnerBranding";
import { createProposal, updateProposal } from "../services/proposalService";
import styles from "./ProductsSalesAssistant.module.css";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatCurrency(value) {
  return currency.format(Number(value) || 0);
}

function getValue(source, keys) {
  if (!source || typeof source !== "object") return undefined;

  const normalizedKeys = keys.map((key) => key.replace(/[^a-z0-9]/gi, "").toLowerCase());
  const matchingKey = Object.keys(source).find((key) =>
    normalizedKeys.includes(key.replace(/[^a-z0-9]/gi, "").toLowerCase())
  );

  return matchingKey === undefined ? undefined : source[matchingKey];
}

function getNumber(source, keys) {
  const value = getValue(source, keys);
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getOffers(payload) {
  if (Array.isArray(payload)) return payload;

  const data = getValue(payload, ["data"]);
  if (Array.isArray(data)) return data;

  const offers = getValue(payload, ["offers"]);
  if (Array.isArray(offers)) return offers;

  const products = getValue(payload, ["products"]);
  if (Array.isArray(products)) return products;

  const nestedOffers = getValue(data, ["offers"]);
  if (Array.isArray(nestedOffers)) return nestedOffers;

  const nestedProducts = getValue(data, ["products"]);
  return Array.isArray(nestedProducts) ? nestedProducts : [];
}

function normalizeOffer(offer, index) {
  const details =
    getValue(offer, ["capitalizationDetails", "capitalisationDetails", "capDetails", "details"]) ||
    offer;
  const read = (keys) => getValue(details, keys) ?? getValue(offer, keys);
  const readNumber = (keys) => getNumber(details, keys) || getNumber(offer, keys);
  const productName = read(["productName", "name", "description"]) || "Produto";
  const offerName = read(["offerName", "name", "description"]) || productName;

  return {
    id: String(read(["offerId", "id", "offerCode", "code", "productId"]) || index),
    productId: String(read(["productId", "product_id", "idProduct"]) || ""),
    offerCode: String(read(["offerCode", "offer_code", "code"]) || ""),
    productName: String(productName),
    offerName: String(offerName),
    details,
    totalContribution: readNumber([
      "totalContribution",
      "totalContribuition",
      "minimumValue",
      "contributionValue",
      "value",
    ]),
    monthTerm: readNumber(["monthTerm", "termMonths", "term", "months"]),
    totalRedemption: readNumber([
      "totalRescue",
      "totalRedemption",
      "rescueValue",
      "redemptionValue",
    ]),
  };
}

export default function ProductsSalesAssistant() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [capacity, setCapacity] = useState("");
  const [months, setMonths] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isStartingSale, setIsStartingSale] = useState(false);

  useEffect(() => {
    async function loadOffers() {
      try {
        const cnpj = getActivePartnerCnpj();
        const response = await fetch(`/bff/outsystems/products?CNPJ=${encodeURIComponent(cnpj)}`, {
          headers: { CNPJ: cnpj },
        });
        if (!response.ok) throw new Error(`OutSystems respondeu ${response.status}`);
        const availableOffers = getOffers(await response.json())
          .map(normalizeOffer)
          .filter((offer) => offer.productId);
        const lowestContribution = Math.min(
          ...availableOffers.map((offer) => offer.totalContribution).filter(Boolean)
        );

        setOffers(availableOffers);
        if (Number.isFinite(lowestContribution)) setCapacity(String(lowestContribution));
      } catch (requestError) {
        console.error("Erro ao carregar ofertas:", requestError);
        setError("Não foi possível carregar as opções agora. Tente novamente.");
      } finally {
        setIsLoading(false);
      }
    }

    loadOffers();
  }, []);

  useEffect(() => {
    if (!selectedOffer) return undefined;

    function handleKeyDown(event) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setQuantity((current) => current + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setQuantity((current) => Math.max(1, current - 1));
      } else if (event.key === "Escape") {
        setSelectedOffer(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedOffer]);

  const capacityValue = Number(capacity) || 0;
  const monthsValue = Number(months) || 0;
  const capacityOptions = [...new Set(offers.map((offer) => offer.totalContribution).filter(Boolean))].sort(
    (first, second) => first - second
  );
  const termOptions = [...new Set(offers.map((offer) => offer.monthTerm).filter(Boolean))].sort(
    (first, second) => first - second
  );
  const hasFilters = capacityValue > 0 || monthsValue > 0;
  const filteredOffers = offers.filter(
    (offer) =>
      (!capacityValue || offer.totalContribution === capacityValue) &&
      (!monthsValue || offer.monthTerm === monthsValue)
  ).sort((first, second) => first.monthTerm - second.monthTerm);
  const unitValue = selectedOffer?.totalContribution || 0;
  const unitRedemption = selectedOffer?.totalRedemption || 0;
  const totalValue = unitValue * quantity;
  const totalRedemption = unitRedemption * quantity;
  const productDetails = selectedOffer?.details || {};
  const detailItems = selectedOffer
    ? [
        ["Contribuição por título", formatCurrency(unitValue)],
        ["Vigência", `${selectedOffer.monthTerm} meses`],
        ["Resgate por título", formatCurrency(unitRedemption)],
        ["Frequência de pagamento", getValue(productDetails, ["paymentFrequencyDescription"])],
        ["Frequência de sorteios", getValue(productDetails, ["lotteryFrequencyDescription"])],
        ["Participações em sorteios", getValue(productDetails, ["qtyLotteries"])],
        ["Sorteio semanal", getNumber(productDetails, ["weeklyPrizeMultiplier"]) ? formatCurrency(getNumber(productDetails, ["weeklyPrizeMultiplier"]) * unitValue) : ""],
        ["Sorteio mensal", getNumber(productDetails, ["monthlyPrizeMultiplier"]) ? formatCurrency(getNumber(productDetails, ["monthlyPrizeMultiplier"]) * unitValue) : ""],
        ["Sorteio semestral", getNumber(productDetails, ["biannualPrizeMultiplier"]) ? formatCurrency(getNumber(productDetails, ["biannualPrizeMultiplier"]) * unitValue) : ""],
      ].filter(([, value]) => value !== undefined && value !== null && value !== "")
    : [];
  const supplementalDetails = detailItems.slice(3);

  function openSale(offer) {
    setQuantity(1);
    setSelectedOffer(offer);
  }

  function updateQuantity(value) {
    const nextValue = Number(value);
    setQuantity(Number.isFinite(nextValue) && nextValue >= 1 ? Math.floor(nextValue) : 1);
  }

  async function startSale() {
    if (!selectedOffer) return;

    try {
      setIsStartingSale(true);
      const proposal = await createProposal({
        productId: selectedOffer.productId,
        offerCode: selectedOffer.offerCode,
        productName: selectedOffer.productName,
        offerName: selectedOffer.offerName,
        quantity,
        unitValue,
        totalValue,
        monthTerm: selectedOffer.monthTerm,
        rescueValue: totalRedemption,
        partnerCnpj: getActivePartnerCnpj(),
        partnerName: getActivePartnerName(),
      });
      const leadDraft = JSON.parse(sessionStorage.getItem("@Mag:leadDraft") || "null");
      if (leadDraft) {
        await updateProposal(proposal.id, {
          client_type: leadDraft.clientType || "fisica",
          document_number: leadDraft.documentNumber || "",
          form_data: leadDraft.formData || {},
        });
        sessionStorage.removeItem("@Mag:leadDraft");
      }
      setSelectedOffer(null);
      navigate(`/proposalflow?id=${proposal.id}`, { state: { proposalId: proposal.id } });
    } catch (saleError) {
      console.error("Erro ao criar proposta:", saleError);
      window.alert("Não foi possível iniciar a venda. Tente novamente.");
    } finally {
      setIsStartingSale(false);
    }
  }

  return (
    <>
      <PartnerHeader />
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Venda assistida</p>
            <h1>Escolher produto</h1>
            <p className={styles.intro}>Conduza a escolha em dois passos simples e apresente alternativas alinhadas ao objetivo do cliente.</p>
          </div>
          <button type="button" className={styles.historyButton} onClick={() => window.dispatchEvent(new Event("openProposalHistory"))}>
            Histórico de propostas
          </button>
        </header>

        <section className={styles.guide} aria-label="Perguntas para encontrar opções">
          <div className={styles.question}>
            <span className={styles.step}>1</span>
            <label htmlFor="capacity">Quanto você consegue destinar mensalmente para essa reserva/conquista?</label>
            <div className={styles.fieldWrap}>
              <select id="capacity" value={capacity} onChange={(event) => setCapacity(event.target.value)}>
                {capacityOptions.map((value) => (
                  <option key={value} value={value}>
                    {formatCurrency(value)} por mês
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.question}>
            <span className={styles.step}>2</span>
            <label htmlFor="months">Em quanto tempo você prefere programar o resgate do seu dinheiro?</label>
            <div className={styles.fieldWrap}>
              <select id="months" value={months} onChange={(event) => setMonths(event.target.value)}>
                <option value="">Todas as vigências</option>
                {termOptions.map((value) => (
                  <option key={value} value={value}>{value} meses</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className={styles.results} aria-live="polite">
          <div className={styles.resultsHeader}>
            <div>
              <p className={styles.eyebrow}>Opções indicadas</p>
              <h2>{hasFilters ? `${filteredOffers.length} opções para apresentar` : "Escolha um critério para começar"}</h2>
            </div>
          </div>

          {isLoading && <p className={styles.status}>Carregando opções...</p>}
          {!isLoading && error && <p className={styles.status}>{error}</p>}
           {!isLoading && !error && !hasFilters && <p className={styles.status}>Informe o valor mensal ou a vigência desejada para ver as opções disponíveis.</p>}
           {!isLoading && !error && hasFilters && filteredOffers.length === 0 && <p className={styles.status}>Não encontramos uma opção para estes critérios. Ajuste os valores e tente novamente.</p>}
           {!isLoading && !error && hasFilters && filteredOffers.length > 0 && (
            <div className={styles.offerGrid}>
              {filteredOffers.map((offer) => (
                <article key={offer.id} className={styles.offerCard}>
                   <div className={styles.offerTitle}>
                     <p>{offer.offerCode}</p>
                     <h3>{offer.productName}</h3>
                   </div>
                  <dl className={styles.details}>
                    <div><dt>Contribuição total</dt><dd>{formatCurrency(offer.totalContribution)}</dd></div>
                    <div><dt>Prazo</dt><dd>{offer.monthTerm} meses</dd></div>
                    <div><dt>Resgate total</dt><dd>{formatCurrency(offer.totalRedemption)}</dd></div>
                  </dl>
                   <button type="button" className={styles.saleButton} onClick={() => openSale(offer)}>Selecionar</button>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {selectedOffer && (
        <div className={styles.overlay} role="presentation" onMouseDown={() => setSelectedOffer(null)}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="sale-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className={styles.modalHeader}>
              <div>
                <h2 id="sale-title">Selecione a quantidade</h2>
                <p>Defina quantos títulos o cliente deseja contratar.</p>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setSelectedOffer(null)} aria-label="Fechar">x</button>
            </header>
            <div className={styles.modalBody}>
              <section className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Detalhes do produto</h3>
                <div className={styles.modalProductSummary}>
                  <div><span>Nome do produto</span><strong>{selectedOffer.productName}</strong></div>
                  <div><span>Contribuição por título</span><strong>{formatCurrency(unitValue)}</strong></div>
                  <div><span>Resgate por título</span><strong>{formatCurrency(unitRedemption)}</strong></div>
                </div>
                {supplementalDetails.length > 0 && (
                  <details className={styles.modalAccordion}>
                    <summary>Ver mais detalhes</summary>
                    <div className={styles.modalDetails}>
                      {supplementalDetails.map(([label, value]) => (
                        <div key={label}>
                          <span>{label}</span>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </section>
              <section className={styles.modalSection}>
                <div className={styles.quantityRow}>
                  <span>Quantidade de títulos</span>
                  <div className={styles.counter}>
                    <button type="button" onClick={() => updateQuantity(quantity - 1)} aria-label="Diminuir quantidade">-</button>
                    <input type="number" min="1" step="1" value={quantity} onChange={(event) => updateQuantity(event.target.value)} aria-label="Quantidade" />
                    <button type="button" onClick={() => updateQuantity(quantity + 1)} aria-label="Aumentar quantidade">+</button>
                  </div>
                </div>
              </section>
            </div>
            <footer className={styles.modalFooter}>
              <div className={styles.totals}>
                <div><span>Pagamento total</span><strong>{formatCurrency(totalValue)}</strong></div>
                <div><span>Resgate total projetado</span><strong>{formatCurrency(totalRedemption)}</strong></div>
              </div>
              <button type="button" className={styles.confirmButton} onClick={startSale} disabled={isStartingSale}>{isStartingSale ? "Iniciando..." : "Iniciar Venda"}</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
