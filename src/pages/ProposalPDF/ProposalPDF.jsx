import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProposalDetails } from '../../services/proposalPdfService';
import { getActivePartnerCnpj, getActivePartnerBranding } from '../../services/partnerBranding';
import styles from './ProposalPDF.module.css';

export default function ProposalPDF() {
  const { proposalNumber } = useParams();
  const [proposalData, setProposalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const branding = getActivePartnerBranding();

  useEffect(() => {
    async function fetchData() {
      try {
        const cnpj = getActivePartnerCnpj();
        const data = await getProposalDetails(proposalNumber, cnpj);
        if (data && data.items && data.items.length > 0) {
          setProposalData(data.items[0]);
        } else {
          setError('Proposta não encontrada.');
        }
      } catch (err) {
        setError('Erro ao carregar os dados da proposta.');
      } finally {
        setLoading(false);
      }
    }

    if (proposalNumber) {
      fetchData();
    }
  }, [proposalNumber]);

  if (loading) {
    return <div className={styles.pdfContainer}><div className={styles.loading}>Carregando PDF da Proposta...</div></div>;
  }

  if (error || !proposalData) {
    return <div className={styles.pdfContainer}><div className={styles.loading}>{error || 'Proposta não encontrada.'}</div></div>;
  }

  const { generalInfo, policyHolders, products, payment, signature } = proposalData;
  const policyHolder = policyHolders && policyHolders[0] ? policyHolders[0].personDetails : {};
  const addresses = policyHolders && policyHolders[0] ? policyHolders[0].addresses : [];
  const address = addresses && addresses.length > 0 ? addresses[0] : {};
  const emails = policyHolders && policyHolders[0] ? policyHolders[0].emails : [];
  const email = emails && emails.length > 0 ? emails[0].email : '';
  const telephones = policyHolders && policyHolders[0] ? policyHolders[0].telephones : [];
  const phone = telephones && telephones.length > 0 ? `${telephones[0].countryCode || ''} ${telephones[0].nationalDestinationCode || ''} ${telephones[0].number || ''}` : '';
  
  const product = products && products.length > 0 ? products[0] : {};
  const coverage = product.coverages && product.coverages.length > 0 ? product.coverages[0] : {};
  const contract = coverage.contracts && coverage.contracts.length > 0 ? coverage.contracts[0] : {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.pdfContainer}>
      <button className={`${styles.printBtn} ${styles.noPrint}`} onClick={handlePrint}>
        Imprimir / Salvar PDF
      </button>

      {/* PAGE 1: COVER */}
      <div className={`${styles.page} ${styles.coverSheet}`}>
        <div className={`${styles.coverPage}`} style={{ height: '100%', minHeight: '297mm' }}>
          {branding?.logo && (
            <img src={branding.logo} alt="Partner Logo" className={styles.coverLogo} />
          )}
          <h1 className={styles.coverTitle}>Proposta de capitalização</h1>
          
          <p className={styles.coverText}>
            A sua proposta contém detalhes da sua capitalização – seus dados, informações de pagamento, dados do vendedor e declarações. Leia atentamente!
            <br /><br />
            Para visualizar as condições gerais do seu título de capitalização onde e quando quiser, acesse o site: www.magcap.com.br.
            <br /><br />
            Caso tenha qualquer dúvida, entre em contato com o seu canal de relacionamento na MAG Capitalização.
          </p>

          <div className={styles.coverFooter}>
            <div>
              <strong>Atendimento ao público - SUSEP</strong>
              <br />0800 021 8484
            </div>
            <div>
              <strong>SAC MAG Capitalização</strong>
              <br />0800 725 7550
            </div>
            <div>
              <strong>WhatsApp MAG Capitalização</strong>
              <br />21 97663 4362
            </div>
          </div>
        </div>
      </div>

      {/* PAGE 2: PROPOSAL AND HOLDER DETAILS */}
      <div className={styles.page}>
        <div className={styles.contentPage}>
          {branding?.logo && (
             <div style={{ filter: 'invert(1)' }}>
                <img src={branding.logo} alt="Partner Logo" className={styles.headerLogo} />
             </div>
          )}
          <h2 className={styles.pageTitle}>Proposta de capitalização</h2>
          <p className={styles.greeting}>
            Olá, <strong>{policyHolder.name || generalInfo.selfPolicyHolderName}</strong>
            <br />
            Esta é a proposta de subscrição de título de capitalização que você acaba de solicitar. Os dados a seguir mostram as características do seu produto, alguns trechos dos termos e condições gerais, detalhes sobre o conceito de capitalização e sorteios, entre outras orientações ao solicitante.
          </p>

          <h3 className={styles.sectionTitle}>Dados da proposta</h3>
          <div className={styles.card}>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Número da proposta</span>
              <span className={styles.cardValue}>{generalInfo.number}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Quantidade de títulos</span>
              <span className={styles.cardValue}>{contract.quantity || '1'}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Produto</span>
              <span className={styles.cardValue}>{product.productId}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Valor total (nº de titulos e valor)</span>
              <span className={styles.cardValue}>{generalInfo.totalContribution?.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Valor do título</span>
              <span className={styles.cardValue}>{(contract.contributionValue || generalInfo.totalContribution)?.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Tipo de pagamento</span>
              <span className={styles.cardValue} style={{ textTransform: 'capitalize' }}>{payment?.firstPayment?.type || 'Debito'}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Vigência do título</span>
              <span className={styles.cardValue}>{coverage.term} meses</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>CPF</span>
              <span className={styles.cardValue}>{policyHolder.document}</span>
            </div>
          </div>

          <h3 className={styles.sectionTitle}>Dados do titular / subscritor</h3>
          <div className={styles.card}>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Nome completo</span>
              <span className={styles.cardValue}>{policyHolder.name}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Nome civil</span>
              <span className={styles.cardValue}>{policyHolder.socialName || policyHolder.name}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Data nascimento</span>
              <span className={styles.cardValue}>{policyHolder.birthday ? new Date(policyHolder.birthday).toLocaleDateString('pt-BR') : ''}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Estado civil</span>
              <span className={styles.cardValue} style={{ textTransform: 'capitalize' }}>{policyHolder.civilStatus}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Nacionalidade</span>
              <span className={styles.cardValue}>{policyHolder.nacionality}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Pronome de preferência</span>
              <span className={styles.cardValue}>{policyHolder.pronoun}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>E-mail</span>
              <span className={styles.cardValue}>{email}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Sexo</span>
              <span className={styles.cardValue} style={{ textTransform: 'capitalize' }}>{policyHolder.sex}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Tipo de pessoa</span>
              <span className={styles.cardValue}>Pessoa física</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Faixa de renda</span>
              <span className={styles.cardValue}>R$ {policyHolder.monthlyIncome?.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Profissão</span>
              <span className={styles.cardValue}>{policyHolder.occupation?.position}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>CEP</span>
              <span className={styles.cardValue}>{address.postalCode}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Telefone</span>
              <span className={styles.cardValue}>{phone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PAGE 3: ADDRESS AND PAYMENT */}
      <div className={styles.page}>
        <div className={styles.contentPage}>
          <h3 className={styles.sectionTitle}>Dados do titular / subscritor</h3>
          <div className={styles.card}>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Endereço</span>
              <span className={styles.cardValue}>{address.street}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Número</span>
              <span className={styles.cardValue}>{address.number}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Complemento</span>
              <span className={styles.cardValue}>{address.complement || '-'}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Bairro</span>
              <span className={styles.cardValue}>{address.district}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Cidade - UF</span>
              <span className={styles.cardValue}>{address.city} - {address.state}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>CEP</span>
              <span className={styles.cardValue}>{address.postalCode}</span>
            </div>
          </div>
          <p className={styles.textBlock}>
            * Consideram-se PPE - Pessoas politicamente expostas os agentes públicos que desempenham ou tenham desempenhado, nos últimos cinco anos, no Brasil ou em países, territórios e dependências estrangeiros, cargos, empregos ou funções públicas relevantes, assim como seus representantes, familiares e outras pessoas de seu relacionamento próximo.
          </p>

          <h3 className={styles.sectionTitle}>Informações de pagamento</h3>
          <div className={styles.card}>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Nome do titular da conta</span>
              <span className={styles.cardValue}>{policyHolder.name}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Dia do vencimento</span>
              <span className={styles.cardValue}>{payment?.firstPayment?.dueDay} de cada mês</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Número do banco</span>
              <span className={styles.cardValue}>{payment?.firstPayment?.paymentDetails?.bankNumber}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Forma de pagamento</span>
              <span className={styles.cardValue} style={{ textTransform: 'capitalize' }}>{payment?.firstPayment?.type === 'debito' ? 'Débito em conta' : payment?.firstPayment?.type}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Nome do banco</span>
              <span className={styles.cardValue}>{payment?.firstPayment?.paymentDetails?.bank}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>CPF do titular</span>
              <span className={styles.cardValue}>{policyHolder.document}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Agência</span>
              <span className={styles.cardValue}>{payment?.firstPayment?.paymentDetails?.agencyNumber}-{payment?.firstPayment?.paymentDetails?.agencyDigit}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Conta-corrente</span>
              <span className={styles.cardValue}>{payment?.firstPayment?.paymentDetails?.accountNumber}-{payment?.firstPayment?.paymentDetails?.accountDigit}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PAGE 4: DECLARATIONS */}
      <div className={styles.page}>
        <div className={styles.contentPage}>
          <h3 className={styles.sectionTitle}>Declarações</h3>
          <p className={styles.textBlock}>
            Autorizo a MAG Capitalização S/A a debitar mensalidades do(s) título(s) de capitalização da conta indicada, conforme registro em extratos bancários, incluindo reajustes conforme as “Condições Gerais”. Declaro estar ciente de que:
          </p>
          <div className={styles.textBlock}>
            1. Os títulos são emitidos pela MAG Capitalização, e o registro na SUSEP não implica recomendação. Consulte informações em www.susep.gov.br;<br /><br />
            2. O saldo suficiente inclui o limite do cheque especial;<br /><br />
            3. Se o saldo for insuficiente para todos os títulos, a MAG debitará o que o saldo permitir, sem ordem específica;<br /><br />
            4. Tentativas de débito podem ocorrer até o próximo vencimento. Durante esse período, não há participação nos sorteios;<br /><br />
            5. Débitos cessam se a conta for encerrada ou não puder receber valores. Após 4 meses sem pagamento, o título será cancelado, e o saldo ficará disponível para resgate;<br /><br />
            6. Resgates ou prêmios serão pagos na conta indicada ou, caso encerrada, por ordem de pagamento. Alterações na conta devem ser comunicadas;<br /><br />
            7. Solicitações de cancelamento ou resgate devem ser feitas com 10 dias de antecedência ao próximo débito via Central de Relacionamento;<br /><br />
            8. Menores de 16 anos não podem adquirir títulos; entre 16 e 18 anos, é necessária a assinatura do representante legal;<br /><br />
            9. O resgate antes do término da vigência pode resultar em valor inferior ao pago. Este título é indicado para quem pretende cumpri-lo até o final;<br /><br />
            10. As Condições Gerais estão disponíveis no verso desta proposta e no WhatsApp: (21) 97663 4362.
          </div>

          <div className={styles.signatureBox}>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Data da assinatura</span>
              <span className={styles.cardValue}>{signature?.signatureDate ? new Date(signature.signatureDate).toLocaleDateString('pt-BR') : ''}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Forma de assinatura</span>
              <span className={styles.cardValue} style={{ textTransform: 'capitalize' }}>{signature?.type}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Meio de envio do token</span>
              <span className={styles.cardValue} style={{ textTransform: 'uppercase' }}>{signature?.tokenConfirmedBy}</span>
            </div>
            <div className={styles.cardItem}>
              <span className={styles.cardLabel}>Endereço de envio do token</span>
              <span className={styles.cardValue}>{signature?.tokenConfirmedUsing}</span>
            </div>
            <div className={styles.cardItem} style={{ gridColumn: 'span 2' }}>
              <span className={styles.cardLabel}>ID da assinatura eletrônica</span>
              <span className={styles.cardValue}>{signature?.signatureId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PAGE 5: CONDITIONS */}
      <div className={styles.page}>
        <div className={styles.contentPage}>
          <div className={styles.textBlock}>
            <strong>* Central de Relacionamento MAG Capitalização</strong><br />
            4020 1898 (capitais) | 0800 025 1898 (demais localidades).<br />
            Título de pagamento mensal da modalidade tradicional emitido pela MAG CAPITALIZAÇÃO S/A, CNPJ/MF nº: 52.780.551/0001-19, SUSEP nº: 15414.618390/2024-60, SAC: 0800 725 7550 (exclusivo para informações públicas, reclamações ou cancelamentos de produtos adquiridos pelo telefone).<br />
            <strong>Ouvidoria:</strong> 0800 725 7550 (2ª a 6ª, das 8h às 18h).<br />
            <strong>SAC (24h):</strong> 0800 725 7550 (24h, reclamações ou cancelamentos).<br /><br />
            <strong>SUSEP – Superintendência de Seguros Privados</strong> – Autarquia Federal responsável pela fiscalização, normatização e controle dos mercados de seguro, previdência complementar aberta, capitalização, resseguro e corretagem de seguros.<br />
            <strong>Central de Atendimento SUSEP:</strong> 0800 021 8484.<br />
            Para conferir todas as informações sobre o(s) produtos(s) de capitalização vinculado(s): www.susep.com.br.
          </div>

          <div className={styles.textBlock}>
            <h3>Resumo das condições gerais do produto {product.productId || 'PM0010T'}</h3>
            1. Esse é um título de <strong>pagamentos Mensal</strong>, emitido pela <strong>MAG Capitalização S/A</strong> (“MAG Capitalização”) e aprovado na SUSEP (Proc. nº 15414.618390/2024-60) <br /><br />
            2. As Condições Gerais completas do Título, além de disponíveis para consulta em momento prévio à aquisição do seu título, podem ser solicitadas no Whatsapp da MAG Capitalização: (21) 97663 4362.<br /><br />
            3. O Título entrará em vigor na data de quitação do primeiro pagamento e sua vigência será de <strong>{coverage.term || '72'} meses</strong>. Não ocorrendo o pagamento na data de vencimento, o Título será suspenso para efeito de sorteio.<br /><br />
            4. Cada Título receberá 4 números aleatórios compostos de 6 algarismos (números da sorte).<br /><br />
            5. O Título sorteado continuará em vigor e não participará mais dos sorteios após o término do prazo de vigência ou a partir da solicitação do resgate antecipado ou do cancelamento do Título por falta de pagamento.<br /><br />
            6. Os Títulos concorrerão a sorteios semanais, mensais e semestrais e observarão as seguintes regras:<br /><br />
            <strong>a) Modalidade Semanal:</strong> Em todos os sábados, exceto o último de cada mês, serão contemplados os títulos da seguinte forma:<br /><br />
            I. Os 6 algarismos do seu número para sorteio (centena de milhar), lidos da esquerda para a direita, coincidirem, na ordem, com a dezena simples e a unidade simples do 1º prêmio e com as unidades simples do 2º ao 5º prêmios da Loteria Federal, conforme exemplo abaixo, <strong>com probabilidade de contemplação de 1 em 250.000</strong>.<br /><br />
            II. Os 5 últimos algarismos de um de seus números para sorteio (dezena de milhar), lidos da esquerda para a direita, coincidirem, na ordem, com as unidades simples do 1º ao 5º prêmios da Loteria Federal, conforme exemplo abaixo, <strong>com probabilidade de contemplação de 10 em 250.000</strong>.
          </div>
        </div>
      </div>

      {/* PAGE 6: CONDITIONS CONTINUED */}
      <div className={styles.page}>
        <div className={styles.contentPage}>
          <div className={styles.textBlock}>
            III. Os 4 (quatro) últimos algarismos do seu número para sorteio (milhar), lidos da esquerda para a direita, coincidirem, na ordem, com as unidades simples do 2º ao 5º prêmios da Loteria Federal, conforme exemplo abaixo, <strong>com probabilidade de contemplação de 100 (cem) em 250.000 (duzentos e cinquenta mil)</strong>.<br /><br />
            
            <strong>b) Modalidade Mensal:</strong> No último sábado de cada mês serão contemplados os Títulos da seguinte forma:<br /><br />
            I. Os 6 algarismos do seu número para sorteio (centena de milhar), lidos da esquerda para direita, coincidirem, na ordem, com a dezena simples e a unidade simples do 1º prêmio e com as unidades simples do 2º ao 5º prêmios da Loteria Federal, conforme exemplo abaixo, <strong>com probabilidade de contemplação de 1 em 250.000</strong>.<br /><br />
            II. Os 5 últimos algarismos de um de seus números para sorteio (dezena de milhar), lidos da esquerda para a direita, coincidirem, na ordem, com as unidades simples do 1º ao 5º prêmios da Loteria Federal, conforme exemplo abaixo, <strong>com probabilidade de contemplação de 10 em 250.000</strong>.<br /><br />
            
            <strong>c) Modalidade Semestral:</strong> No último sábado de Junho e último sábado de Dezembro serão contemplados os Títulos da seguinte forma:<br /><br />
            I. Os 6 algarismos do seu número para sorteio (centena de milhar), lidos da esquerda para a direita, coincidirem, na ordem, com a dezena simples e a unidade simples do 1º prêmio e com as unidades simples do 2º ao 5º prêmios da Loteria Federal, conforme exemplo abaixo, <strong>com probabilidade de contemplação de 1 em 250.000</strong>.<br /><br />
            
            <strong>7. O número sorteado será formado tomando como base as extrações da Loteria Federal do Brasil:</strong><br /><br />
            <div style={{ padding: '20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center', marginBottom: '20px' }}>
              <em>(Tabela de exemplo de extração da Loteria Federal)</em>
            </div>
            
            <strong>8. Dos prêmios de sorteios serão retidos os tributos previstos em lei, que correspondem a 30% do valor sorteado.</strong><br /><br />
            <strong>9. O montante a ser resgatado é formado por parte do pagamento feito periodicamente e será mensalmente atualizado e capitalizado, estando disponível ao Titular após 6 meses de carência, contados do início da vigência.</strong>
          </div>
        </div>
      </div>

      {/* PAGE 7: TABLE 1 */}
      <div className={styles.page}>
        <div className={styles.contentPage}>
          <div className={styles.textBlock}>
            10. A Tabela 1 apresenta o valor mínimo que poderá ser resgatado pelo(s) Titular(es)
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Vigência</th>
                <th>Resgate sobre a<br/>contribuição paga<br/>(Em Porcentagem)</th>
                <th>Vigência</th>
                <th>Resgate sobre a<br/>contribuição paga<br/>(Em Porcentagem)</th>
                <th>Vigência</th>
                <th>Resgate sobre a<br/>contribuição paga<br/>(Em Porcentagem)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>50,00%</td><td>25</td><td>59,96%</td><td>49</td><td>82,69%</td></tr>
              <tr><td>2</td><td>50,00%</td><td>26</td><td>60,38%</td><td>50</td><td>83,33%</td></tr>
              <tr><td>3</td><td>50,00%</td><td>27</td><td>60,78%</td><td>51</td><td>83,95%</td></tr>
              <tr><td>4</td><td>50,00%</td><td>28</td><td>61,16%</td><td>52</td><td>84,57%</td></tr>
              <tr><td>5</td><td>50,00%</td><td>29</td><td>61,53%</td><td>53</td><td>85,17%</td></tr>
              <tr><td>6</td><td>50,00%</td><td>30</td><td>62,45%</td><td>54</td><td>85,76%</td></tr>
              <tr><td>7</td><td>50,00%</td><td>31</td><td>63,63%</td><td>55</td><td>90,88%</td></tr>
              <tr><td>8</td><td>50,00%</td><td>32</td><td>64,74%</td><td>56</td><td>91,48%</td></tr>
              <tr><td>9</td><td>50,00%</td><td>33</td><td>65,80%</td><td>57</td><td>92,07%</td></tr>
              <tr><td>10</td><td>50,00%</td><td>34</td><td>66,82%</td><td>58</td><td>92,65%</td></tr>
              <tr><td>11</td><td>50,00%</td><td>35</td><td>67,79%</td><td>59</td><td>93,22%</td></tr>
              <tr><td>12</td><td>50,82%</td><td>36</td><td>68,72%</td><td>60</td><td>93,78%</td></tr>
              <tr><td>13</td><td>52,02%</td><td>37</td><td>73,49%</td><td>61</td><td>94,33%</td></tr>
              <tr><td>14</td><td>53,07%</td><td>38</td><td>74,39%</td><td>62</td><td>94,88%</td></tr>
              <tr><td>15</td><td>54,00%</td><td>39</td><td>75,27%</td><td>63</td><td>95,42%</td></tr>
              <tr><td>16</td><td>54,83%</td><td>40</td><td>76,12%</td><td>64</td><td>95,95%</td></tr>
              <tr><td>17</td><td>55,59%</td><td>41</td><td>76,94%</td><td>65</td><td>96,47%</td></tr>
              <tr><td>18</td><td>56,28%</td><td>42</td><td>77,73%</td><td>66</td><td>96,99%</td></tr>
              <tr><td>19</td><td>56,92%</td><td>43</td><td>78,50%</td><td>67</td><td>97,51%</td></tr>
              <tr><td>20</td><td>57,51%</td><td>44</td><td>79,24%</td><td>68</td><td>98,02%</td></tr>
              <tr><td>21</td><td>58,06%</td><td>45</td><td>79,97%</td><td>69</td><td>98,52%</td></tr>
              <tr><td>22</td><td>58,58%</td><td>46</td><td>80,67%</td><td>70</td><td>99,02%</td></tr>
              <tr><td>23</td><td>59,06%</td><td>47</td><td>81,36%</td><td>71</td><td>99,51%</td></tr>
              <tr><td>24</td><td>59,52%</td><td>48</td><td>82,03%</td><td>72</td><td>100,00%</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGE 8: TABLE 2 AND FINAL TEXT */}
      <div className={styles.page}>
        <div className={styles.contentPage}>
          <div className={styles.textBlock}>
            11. Fatores de redução sobre a Provisão Matemática para Capitalização, previstos na Tabela 2, quando o resgate ocorrer antes do término do prazo de vigência:
            <br /><br />
            <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '600px', fontWeight: 'bold' }}>
              <div>Mês de vigência 1 à 36<br />Fator de redução 10,00%</div>
              <div>Mês de vigência 37 à 54<br />Fator de redução 5,00%</div>
              <div>Mês de vigência 55 à 72<br />Fator de redução 0,00%</div>
            </div>
            <br /><br />
            12. A Sociedade de Capitalização terá até 15 dias corridos, contados a partir da apresentação dos documentos necessários para o recebimento do resgate, para efetivar o pagamento, exceto no caso de fim de vigência de títulos adquiridos por meio de débito automático em conta, ressalvada as exceções previstas na legislação.<br /><br />
            13. A MAG Capitalização deverá notificar o(s) titular(es) contemplado(s) em sorteio, por escrito, mediante correspondência expedida com aviso de recebimento AR ou por qualquer outro meio que se possa comprovar, em até 40 (quarenta) dias a partir da data da realização do sorteio. O efetivo pagamento do prêmio ao sorteado neste prazo exime a necessidade de notificação. A MAG Capitalização terá até 15 dias corridos, contados a partir da apresentação dos documentos necessários para o recebimento do sorteio, para efetivar o pagamento.<br /><br />
            14. Prescrição: Os prazos prescricionais decorrentes deste Título, incluindo, o direito a resgate e sorteio, cessam, automaticamente e de pleno direito, no prazo estabelecidos na legislação em vigor, o qual atualmente é de 5 anos, conforme previsto no Código Civil de 2002.<br /><br />
            15. Haverá dedução de Imposto de Renda no pagamento de sorteio
          </div>
        </div>
      </div>

    </div>
  );
}
