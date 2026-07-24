// src/services/partnerService.js
import { api } from './api';

export const getPartners = async (cnpj) => {
  const response = await api.get('/api/sales-cap/v1/partners', {
    params: {
      modality: 'traditional'
    },
    headers: {
      'cnpj': cnpj
    }
  });
  
  return response.data;
};