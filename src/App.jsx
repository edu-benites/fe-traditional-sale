import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Access from './pages/Access';
import Products from './pages/Products';
import ProposalFlow from './pages/ProposalFlow';
import ProposalHistoryModal from './components/ProposalHistoryModal/ProposalHistoryModal';

export default function App() {
  return (
    <BrowserRouter>
      {/* Modal global de Histórico de Propostas — responde ao evento do Header em qualquer página */}
      <ProposalHistoryModal />
      <Routes>
        <Route path="/" element={<Access />} />
        <Route path="/products" element={<Products />} />
        <Route path="/proposalflow" element={<ProposalFlow />} />
      </Routes>
    </BrowserRouter>
  );
}