import axios from 'axios';

// Mantido como ponto de compatibilidade. O token nunca é devolvido ao browser.
export const generateSensediaToken = async () => {
  const response = await axios.post('/bff/auth/refresh');
  return response.data;
};
