import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Access from './pages/Access';
import Products from './pages/Products';
import ProposalFlow from './pages/ProposalFlow';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Access />} />
        <Route path="/products" element={<Products />} />
        <Route path="/proposalflow" element={<ProposalFlow />} />
      </Routes>
    </BrowserRouter>
  );
}