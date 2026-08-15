import { useState, useEffect } from "react";
import { MainLayout, Icon } from "mag-design-system";
import { getOffers } from "../services/offerService";
import { api } from "../services/api";
import styles from "./Products.module.css";

export default function Products() {
  const [productsList, setProductsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
          api.defaults.headers.common["cnpj"];
        if (cnpj) {
          api.defaults.headers.common["CNPJ"] = cnpj;
        }

        const data = await getOffers(cnpj);
        const formattedProducts = [];

        // Mapeamento correto com base na estrutura aninhada real do OutSystems
        if (data && Array.isArray(data.items)) {
          data.items.forEach((offer) => {
            const offerName = offer?.businessPartner?.commercialName || offer?.OfferName || "Oferta";
            
            if (offer && Array.isArray(offer.basicProducts)) {
              offer.basicProducts.forEach((product) => {
                const productName = product?.productName || product?.ProductName || "Produto";
                const capDetails = product?.capitalizationDetails || product || {};
                
                const totalContribution = Number(capDetails?.minimumValue || capDetails?.TotalContribution) || 0;
                const monthTerm = Number(capDetails?.monthTerm || capDetails?.MonthTerm) || 0;
                const totalRescue = Number(capDetails?.totalRescue || capDetails?.TotalRescue || (totalContribution * 72)) || 0;

                formattedProducts.push({
                  id: product?.productId || Math.random(),
                  name: `${offerName} - ${productName}`.trim(),
                  rawMinimumValue: totalContribution,
                  payment: formatCurrency(totalContribution),
                  vigence: `${monthTerm} meses`,
                  rescue: formatCurrency(totalRescue),
                  details: {
                    ...offer,
                    ...product,
                    OfferName: offerName,
                    ProductName: productName,
                    TotalContribution: totalContribution,
                    MonthTerm: monthTerm,
                    TotalRescue: totalRescue,
                  },
                });
              });
            }
          });
        }

        setProductsList(formattedProducts);
      } catch (error) {
        console.error("Erro ao buscar ofertas:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffers();
  }, []);

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

  return (
    <MainLayout>
      <div className={styles.pageContainer}>
        <div className={styles.mainContent}>
          <div className={styles.titleSection}>
            <h1>Produtos Disponíveis</h1>
            <p>Selecione um produto para visualizar detalhes ou iniciar a contratação.</p>
          </div>

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>Carregando produtos...</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nome do produto</th>
                  <th>Pagamento</th>
                  <th>Vigência</th>
                  <th>Resgate</th>
                  <th>Ver Detalhes / Ação</th>
                </tr>
              </thead>
              <tbody>
                {productsList.length > 0 ? (
                  productsList.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.payment}</td>
                      <td>
                        <span className={styles.badgeVigence}>{item.vigence}</span>
                      </td>
                      <td>{item.rescue}</td>
                      <td className={styles.actionsCell}>
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
              1 a {productsList.length} de {productsList.length} itens
            </span>
            <div className={styles.pagination}>
              <button disabled>&lt;</button>
              <button className={styles.activePage}>1</button>
              <button disabled>&gt;</button>
            </div>
          </div>
        </div>

        {/* Modal 1: Detalhes do Produto (Nativo) */}
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
                  <p><strong>Nome da Oferta:</strong> {selectedProductDetails.OfferName}</p>
                  <p><strong>Nome do Produto:</strong> {selectedProductDetails.ProductName}</p>
                  <p><strong>Contribuição Total:</strong> {formatCurrency(selectedProductDetails.TotalContribution)}</p>
                  <p><strong>Vigência (Meses):</strong> {selectedProductDetails.MonthTerm}</p>
                  <p><strong>Resgate Total:</strong> {formatCurrency(selectedProductDetails.TotalRescue)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: Selecione a quantidade (Nativo) */}
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

              {/* Rodapé Estilizado */}
              <div style={{ borderTop: "1px solid #e0e0e0", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderBottomLeftRadius: "8px", borderBottomRightRadius: "8px" }}>
                <div>
                  <span style={{ display: "block", fontSize: "0.8rem", color: "#666" }}>Valor total</span>
                  <strong style={{ fontSize: "1.3rem", color: "#003366" }}>{formatCurrency(calculatedTotal)}</strong>
                </div>
                <button 
                  type="button"
                  style={{ backgroundColor: "#003366", color: "#ffffff", border: "none", padding: "12px 24px", borderRadius: "6px", fontWeight: "600", fontSize: "0.95rem", cursor: "pointer" }}
                  onClick={() => alert("Avançando para o preenchimento dos dados do cliente...")}
                >
                  Iniciar Venda
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
}