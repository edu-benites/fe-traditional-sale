// src/services/partnerService.js
import { api } from './api';

export const getPartners = async (cnpj) => {
  const normalizedCnpj = String(cnpj || '').replace(/\D/g, '');
  const response = await api.get('/api/sales-cap/v1/partners', {
    params: {
      modality: 'incentive'
    },
    headers: {
      'cnpj': normalizedCnpj,
      'x-cnpj': normalizedCnpj,
    }
  });
  
  return response.data;
};
