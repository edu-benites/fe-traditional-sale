import { api } from './api';

export const getOffers = async (cnpj) => {
  const response = await api.get('/api/offers-cap/v1/offers', {
    headers: {
      'CNPJ': cnpj
    }
  });
  
  return response.data;
};