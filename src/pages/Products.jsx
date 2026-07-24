import { useState, useEffect } from "react";
import { MainLayout, Icon } from "mag-design-system";
import { getOffers } from "../services/offerService";
import { api } from "../services/api";
import styles from "./Products.module.css";

export default function Products() {
  const [productsList, setProductsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

        data.items.forEach((offer) => {
          offer.basicProducts.forEach((product) => {
            formattedProducts.push({
              id: product.productId,
              name: `${offer.businessPartner.commercialName || "Parceiro"} - ${product.productName}`,
              payment: `R$ ${product.capitalizationDetails?.minimumValue?.toFixed(2).replace(".", ",") || "0,00"}`,
              vigence: `${product.capitalizationDetails?.monthTerm || 0} meses`,
              rescue: `R$ ${(product.capitalizationDetails?.minimumValue * 72 || 0).toFixed(2).replace(".", ",")}`,
            });
          });
        });

        setProductsList(formattedProducts);
      } catch (error) {
        console.error("Error fetching offers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffers();
  }, []);

  return (
    <MainLayout showHeader={true}>
      <div className={styles.titleSection}>
        <h1>Produtos</h1>
        <p>Escolha um dos produtos para iniciar a cotação.</p>
      </div>

      <div className={styles.tableCard}>
        {isLoading ? (
          <div style={{ padding: "32px", textAlign: "center" }}>
            Carregando produtos...
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome do produto</th>
                <th>Pagamento</th>
                <th>Vigência</th>
                <th>Resgate ?</th>
                <th>Ver Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {productsList.map((item, index) => (
                <tr key={index}>
                  <td>{item.name}</td>
                  <td>{item.payment}</td>
                  <td>
                    <span className={styles.badgeVigence}>{item.vigence}</span>
                  </td>
                  <td>{item.rescue}</td>
                  <td className={styles.actionsCell}>
                    <button className={styles.iconButton} title="Detalhes">
                      <Icon.Document size={18} color="var(--color-primary)" />
                    </button>
                    <Icon.ChevronRight size={18} className={styles.arrow} />
                  </td>
                </tr>
              ))}
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
    </MainLayout>
  );
}
