import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Access from './pages/Access';
import Products from './pages/Products';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Access />} />
        <Route path="/products" element={<Products />} />
      </Routes>
    </BrowserRouter>
  );
}