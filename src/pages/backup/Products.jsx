import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout, Icon } from "mag-design-system";
import { createProposal } from "../../services/proposalService";
import { api } from "../../services/api";
import styles from "../Products.module.css";

export function ProductsBackup() {
  const navigate = useNavigate();
  const [productsList, setProductsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingSale, setIsStartingSale] = useState(false);

  // Filtros da lista
  const [filterProductName, setFilterProductName] = useState("");
  const [filterPayment, setFilterPayment] = useState(""); // Single combo
  const [filterVigence, setFilterVigence] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Options dos filtros (preenchidas ao carregar os produtos)
  const [productNames, setProductNames] = useState([]);
  const [paymentValues, setPaymentValues] = useState([]);

  // Estados dos Modais
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [selectedProductSale, setSelectedProductSale] = useState(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Função utilitária corporativa para formatar valores no padrão monetário brasileiro
  const formatCurrency = (value) => {
    const num = Number(value) || 0;
    return num.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const cnpj =
          localStorage.getItem("@Mag:cnpj") ||
          api.defaults.headers.common["cnpj"] ||
          "";

        if (cnpj) {
          api.defaults.headers.common["CNPJ"] = cnpj;
        }

        // API Venda Assistida CAP - endpoint oficial de homologação
        const headers = {
          'Content-Type': 'application/json',
          'CNPJ': cnpj,
        };

        const newApiUrl = `/bff/outsystems/products?CNPJ=${encodeURIComponent(cnpj)}`;
        const response = await fetch(newApiUrl, {
          method: 'GET',
          headers: headers,
        });

        if (!response.ok) {
          throw new Error('Erro ao buscar produtos da API. Status: ' + response.status);
        }

        const data = await response.json();
        const formattedProducts = [];

        // Novo formato de resposta da API Venda Assistida
        if (data && (Array.isArray(data) || data.products)) {
          const productsList = Array.isArray(data) ? data : data.products;

          productsList.forEach((product) => {
            const productName = product?.productName || product?.ProductName || "Produto";
            const capDetails = product?.capitalizationDetails || product || {};
            const productId =
              product?.ProductId ||
              product?.productId ||
              capDetails?.ProductId ||
              capDetails?.productId ||
              "";

            const multiplier = Number(capDetails?.Multiplier) || 0;
            const maximumValue = Number(capDetails?.MaximumValue) || 0;

            const totalRescue = Number(capDetails?.totalRescue || capDetails?.TotalRescue) || 0;

            let totalContribution = Number(capDetails?.minimumValue || capDetails?.TotalContribution) || 0;
            const monthTerm = Number(capDetails?.monthTerm || capDetails?.MonthTerm) || 0;

            // Lógica de multiplicação de produtos baseado em Multiplier e MaximumValue
            if (multiplier > 0 && maximumValue > 0) {
              const multiplierProduct = maximumValue / multiplier;

              for (let i = multiplierProduct; i >= 1; i--) {
                const currentTotalContribution = multiplier * i;

                formattedProducts.push({
                  id: productId || Math.random(),
                  productId,
                  name: `${productName}`.trim(),
                  rawMinimumValue: currentTotalContribution,
                  payment: formatCurrency(currentTotalContribution),
                  vigence: `${monthTerm} meses`,
                  rescue: formatCurrency(totalRescue),
                  details: {
                    ...capDetails,
                    productName: productName,
                    TotalContribution: currentTotalContribution,
                    MonthTerm: monthTerm,
                    TotalRescue: totalRescue,
                    Multiplier: multiplier,
                    MaximumValue: maximumValue,
                    MultiplierProduct: i,
                  },
                });
              }
            } else {
              formattedProducts.push({
                id: productId || Math.random(),
                productId,
                name: `${productName}`.trim(),
                rawMinimumValue: totalContribution,
                payment: formatCurrency(totalContribution),
                vigence: `${monthTerm} meses`,
                rescue: formatCurrency(totalRescue),
                details: {
                  ...capDetails,
                  productName: productName,
                  TotalContribution: totalContribution,
                  MonthTerm: monthTerm,
                  TotalRescue: totalRescue,
                },
              });
            }
          });
        }

        setProductsList(formattedProducts);
        setProductNames([...new Set(formattedProducts.map((item) => item.name))].sort());
        setPaymentValues(
          [...new Set(formattedProducts.map((item) => item.payment))].sort((a, b) => {
            const valueA = formattedProducts.find((item) => item.payment === a)?.rawMinimumValue || 0;
            const valueB = formattedProducts.find((item) => item.payment === b)?.rawMinimumValue || 0;
            return valueA - valueB;
          })
        );
      } catch (error) {
        console.error("Erro ao buscar ofertas:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffers();
  }, []);

  // Computed filtered products
  const filteredProducts = productsList.filter((item) => {
    const nameMatch = filterProductName
      ? item.name.toLowerCase().includes(filterProductName.toLowerCase())
      : true;

    const paymentMatch =
      filterPayment
        ? item.payment === filterPayment
        : true;

    const vigenceMatch = !filterVigence || item.vigence === filterVigence;

    return nameMatch && paymentMatch && vigenceMatch;
  });

  const vigenceValues = [...new Set(productsList.map((item) => item.vigence))].sort(
    (first, second) => Number(first) - Number(second)
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filterProductName, filterPayment, filterVigence]);

  useEffect(() => {
    if (!isSaleModalOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setQuantity((current) => current + 1);
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setQuantity((current) => Math.max(1, current - 1));
      }

      if (event.key === "Escape") {
        setIsSaleModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaleModalOpen]);

  useEffect(() => {
    if (!isDetailsModalOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsDetailsModalOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDetailsModalOpen]);

  const pageSize = 10;
  const sortedProducts = [...filteredProducts]
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, "pt-BR") ||
        Number(a.rawMinimumValue) - Number(b.rawMinimumValue)
    );
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const displayedProducts = sortedProducts.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize
  );
  const firstItem = sortedProducts.length ? (activePage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(activePage * pageSize, sortedProducts.length);

  const handleOpenDetails = (item) => {
    setSelectedProductDetails(item.details);
    setIsDetailsModalOpen(true);
  };

  const handleOpenSale = (item) => {
    setSelectedProductSale(item);
    setQuantity(1);
    setIsSaleModalOpen(true);
  };

  const unitValue = Number(selectedProductSale?.rawMinimumValue) || 0;
  const currentQty = Number(quantity) || 1;
  const calculatedTotal = unitValue * currentQty;
  const unitRescue = Number(selectedProductSale?.details?.TotalRescue) || 0;
  const calculatedRescue = unitRescue * currentQty;
  const prizeDraws = selectedProductDetails
    ? [
        ["Valor do sorteio semanal", selectedProductDetails.WeeklyPrizeMultiplier],
        ["Valor do sorteio mensal", selectedProductDetails.MonthlyPrizeMultiplier],
        ["Valor do sorteio semestral", selectedProductDetails.BiannualPrizeMultiplier],
      ].filter(([, multiplier]) => Number(multiplier) > 0)
    : [];

  const handleStartSale = async () => {
    if (!selectedProductSale) return;

    try {
      setIsStartingSale(true);

      const proposal = await createProposal({
        productId: selectedProductSale.productId,
        offerCode:
          selectedProductSale.details?.OfferCode ||
          selectedProductSale.details?.offerCode ||
          "",
        productName: selectedProductSale.details?.ProductName || selectedProductSale.name,
        offerName: selectedProductSale.details?.OfferName || "",
        quantity: currentQty,
        unitValue: unitValue,
        totalValue: calculatedTotal,
        monthTerm: selectedProductSale.details?.MonthTerm || 0,
        rescueValue: calculatedRescue,
        partnerCnpj: localStorage.getItem("@Mag:cnpj") || "",
        partnerName: localStorage.getItem("@Mag:partnerName") || "",
      });

      setIsSaleModalOpen(false);
      navigate(`/proposalflow?id=${proposal.id}`, {
        state: { proposalId: proposal.id }
      });
    } catch (error) {
      console.error("Erro ao criar proposta:", error);
      alert("Ocorreu um erro ao iniciar a venda. Tente novamente.");
    } finally {
      setIsStartingSale(false);
    }
  };

  return (
    <MainLayout>
      <div className={styles.pageContainer}>
        <div className={styles.mainContent}>
          <div className={styles.titleSection}>
            <h1>Produtos Disponíveis</h1>
            <p>Selecione um produto para visualizar detalhes ou iniciar a contratação.</p>

            <div className={styles.filterToolbar}>
              <div className={styles.filterFields}>
                <div className={styles.filterGroup}>
                <label htmlFor="product-filter">Nome do Produto</label>
                <select
                  id="product-filter"
                  className={styles.filterSelect}
                  value={filterProductName}
                  onChange={(e) => setFilterProductName(e.target.value)}
                >
                  <option value="">Todos</option>
                  {productNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                </div>
                <div className={styles.filterGroup}>
                <label htmlFor="payment-filter">Valor da Parcela</label>
                <select
                  id="payment-filter"
                  className={styles.filterSelect}
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value || "")}
                >
                  <option value="">Todos</option>
                  {paymentValues.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                </div>
                <div className={styles.filterGroup}>
                <label htmlFor="term-filter">Vigência</label>
                <select
                  id="term-filter"
                  className={styles.filterSelect}
                  value={filterVigence}
                  onChange={(e) => setFilterVigence(e.target.value)}
                >
                  <option value="">Todos</option>
                  {vigenceValues.map((vigence) => (
                    <option key={vigence} value={vigence}>
                      {vigence}
                    </option>
                  ))}
                </select>
                </div>
              </div>
              <button
                type="button"
                className={`${styles.primaryButtonSmall} ${styles.historyButton}`}
                onClick={() => window.dispatchEvent(new Event("openProposalHistory"))}
              >
                Histórico de Propostas
              </button>
            </div>
          </div>

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>Carregando produtos...</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nome do produto</th>
                  <th className={styles.centeredColumn}>Parcela</th>
                  <th className={styles.centeredColumn}>Vigência</th>
                  <th className={styles.centeredColumn}>Resgate</th>
                  <th className={styles.centeredColumn}>Ver Detalhes / Ação</th>
                </tr>
              </thead>
              <tbody>
                {displayedProducts.length > 0 ? (
                  displayedProducts.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td className={styles.centeredColumn}>{item.payment}</td>
                      <td className={styles.centeredColumn}>
                        <span className={styles.badgeVigence}>{item.vigence}</span>
                      </td>
                      <td className={styles.centeredColumn}>{item.rescue}</td>
                      <td className={`${styles.actionsCell} ${styles.centeredColumn}`}>
                        <button
                          type="button"
                          className={styles.iconButton}
                          title="Detalhes do Produto"
                          onClick={() => handleOpenDetails(item)}
                        >
                          <Icon.Document size={18} color="var(--color-primary)" />
                        </button>
                        <button
                          type="button"
                          className={styles.primaryButtonSmall}
                          onClick={() => handleOpenSale(item)}
                        >
                          Iniciar Venda
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "24px" }}>
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          <div className={styles.tableFooter}>
            <span>
              {firstItem} a {lastItem} de {filteredProducts.length} itens
            </span>
            <div className={styles.pagination}>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={activePage === 1}
                aria-label="Página anterior"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  type="button"
                  key={page}
                  className={page === activePage ? styles.activePage : ""}
                  onClick={() => setCurrentPage(page)}
                  aria-label={`Página ${page}`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={activePage === totalPages}
                aria-label="Próxima página"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* Modal 1: Detalhes do Produto */}
        {isDetailsModalOpen && selectedProductDetails && (
          <div className={styles.overlay} onClick={() => setIsDetailsModalOpen(false)}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
              <header className={styles.modalHeader}>
                <h2>Detalhes do Produto</h2>
                <button type="button" className={styles.closeButton} onClick={() => setIsDetailsModalOpen(false)}>
                  ✕
                </button>
              </header>
              <div className={styles.modalBody}>
                <div className={styles.modalContentGrid}>
                  <div className={styles.detailItem}>
                    <span>Valor da Parcela</span>
                    <strong>{formatCurrency(selectedProductDetails.TotalContribution)}</strong>
                  </div>
                  <div className={styles.detailItem}>
                    <span>Vigência</span>
                    <strong>
                      {selectedProductDetails.MonthTerm
                        ? `${selectedProductDetails.MonthTerm} meses`
                        : "-"}
                    </strong>
                  </div>
                  <div className={styles.detailItem}>
                    <span>Resgate</span>
                    <strong>{formatCurrency(selectedProductDetails.TotalRescue)}</strong>
                  </div>
                  <div className={styles.detailItem}>
                    <span>Pagamento</span>
                    <strong>
                      {selectedProductDetails.PaymentFrequencyDescription
                        ? `R$ ${selectedProductDetails.PaymentFrequencyDescription}`
                        : "-"}
                    </strong>
                  </div>
                  <div className={styles.detailItem}>
                    <span>Sorteios</span>
                    <strong>{selectedProductDetails.LotteryFrequencyDescription || "-"}</strong>
                  </div>
                  <div className={styles.detailItem}>
                    <span>Participações em sorteios</span>
                    <strong>{selectedProductDetails.QtyLotteries ?? "-"}</strong>
                  </div>
                  {prizeDraws.map(([label, multiplier]) => (
                    <div className={styles.detailItem} key={label}>
                      <span>{label}</span>
                      <strong>
                        até {formatCurrency(Number(multiplier) * Number(selectedProductDetails.TotalContribution))}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: Selecione a quantidade */}
        {isSaleModalOpen && selectedProductSale && (
          <div className={styles.overlay} onClick={() => setIsSaleModalOpen(false)}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
              <header className={styles.modalHeader}>
                <div>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: "700", color: "#003366", margin: 0 }}>Selecione a quantidade</h2>
                  <p style={{ fontSize: "0.85rem", color: "#666", margin: "4px 0 0 0" }}>Selecione quantos produtos o cliente quer adquirir.</p>
                </div>
                <button type="button" className={styles.closeButton} onClick={() => setIsSaleModalOpen(false)}>
                  ✕
                </button>
              </header>
              <div className={styles.modalBody}>
                <div className={styles.saleModalContent}>

                  <div className={styles.summaryItem} style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: "12px" }}>
                    <span style={{ color: "#555", fontWeight: "500" }}>Nome do produto</span>
                    <strong style={{ color: "#111" }}>{selectedProductSale.name}</strong>
                  </div>

                  <div className={styles.summaryItem} style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: "12px" }}>
                    <span style={{ color: "#555", fontWeight: "500" }}>Pagamento por produto</span>
                    <strong style={{ color: "#111" }}>{formatCurrency(unitValue)}</strong>
                  </div>

                  <div className={styles.summaryItem} style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: "12px" }}>
                    <span style={{ color: "#555", fontWeight: "500" }}>Estimativa de resgate</span>
                    <strong style={{ color: "#111" }}>{formatCurrency(calculatedRescue)}</strong>
                  </div>

                  <div className={styles.summaryItem} style={{ alignItems: "center", padding: "8px 0" }}>
                    <span style={{ color: "#555", fontWeight: "500" }}>Quantidade de título</span>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #dcdcdc", borderRadius: "6px", overflow: "hidden" }}>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, currentQty - 1))}
                        style={{ background: "#f5f5f5", border: "none", padding: "8px 14px", cursor: "pointer", fontSize: "1rem", color: "#333" }}
                      >
                        -
                      </button>
                      <input
                        type="text"
                        value={quantity}
                        readOnly
                        style={{ width: "50px", textAlign: "center", border: "none", outline: "none", fontSize: "1rem", fontWeight: "600", background: "#fff" }}
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity(currentQty + 1)}
                        style={{ background: "#f5f5f5", border: "none", padding: "8px 14px", cursor: "pointer", fontSize: "1rem", color: "#333" }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* Rodapé Estilizado do Modal */}
              <div style={{ borderTop: "1px solid #e0e0e0", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderBottomLeftRadius: "8px", borderBottomRightRadius: "8px" }}>
                <div>
                  <span style={{ display: "block", fontSize: "0.8rem", color: "#666" }}>Valor da Parcela</span>
                  <strong style={{ fontSize: "1.3rem", color: "#003366" }}>{formatCurrency(calculatedTotal)}</strong>
                </div>
                <button
                  type="button"
                  style={{ backgroundColor: "#003366", color: "#ffffff", border: "none", padding: "12px 24px", borderRadius: "6px", fontWeight: "600", fontSize: "0.95rem", cursor: isStartingSale ? "not-allowed" : "pointer", opacity: isStartingSale ? 0.7 : 1 }}
                  onClick={handleStartSale}
                  disabled={isStartingSale}
                >
                  {isStartingSale ? "Iniciando..." : "Iniciar Venda"}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
}
