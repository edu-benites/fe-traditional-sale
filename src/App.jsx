import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Access from './pages/Access';
import Products from './pages/Products';
import ProposalFlow from './pages/ProposalFlow';
import Envio from './pages/Envio';
import Extrato from './pages/Extrato';
import ProposalPDF from './pages/ProposalPDF/ProposalPDF';
import ProposalHistoryModal from './components/ProposalHistoryModal/ProposalHistoryModal';
import {
  getActivePartnerBranding,
  PARTNER_BRANDING_EVENT,
} from './services/partnerBranding';

function PartnerBrandingInitializer() {
  useEffect(() => {
    const applyBranding = () => {
      const branding = getActivePartnerBranding();
      if (branding?.primaryColour) {
        document.documentElement.style.setProperty('--color-primary', branding.primaryColour);
      } else {
        document.documentElement.style.removeProperty('--color-primary');
      }
    };

    applyBranding();
    window.addEventListener(PARTNER_BRANDING_EVENT, applyBranding);
    window.addEventListener('storage', applyBranding);

    return () => {
      window.removeEventListener(PARTNER_BRANDING_EVENT, applyBranding);
      window.removeEventListener('storage', applyBranding);
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <PartnerBrandingInitializer />
      {/* Modal global de Histórico de Propostas — responde ao evento do Header em qualquer página */}
      <ProposalHistoryModal />
      <Routes>
        <Route path="/" element={<Access />} />
        <Route path="/products" element={<Products />} />
        <Route path="/proposalflow" element={<ProposalFlow />} />
        <Route path="/envio" element={<Envio />} />
        <Route path="/extrato" element={<Extrato />} />
        <Route path="/proposal-pdf/:proposalNumber" element={<ProposalPDF />} />
      </Routes>
    </BrowserRouter>
  );
}
