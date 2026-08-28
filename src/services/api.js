import axios from 'axios';
import { API_BASE_URL } from './integrationConfig';

// Criação da instância base do Axios para o projeto MAG
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// O BFF injeta a credencial no servidor; nenhum token de integração sai no bundle.
api.interceptors.request.use(
  (config) => {
    const cnpj = sessionStorage.getItem('@Mag:cnpj')?.replace(/\D/g, '');
    if (cnpj) {
      config.headers.cnpj ||= cnpj;
      config.headers['x-cnpj'] ||= cnpj;
    }
    if (import.meta.env.DEV) {
      console.group(`🚀 [API Request] ${config.method?.toUpperCase()} ${config.url}`);
      console.log('Headers:', config.headers);
      console.log('Payload (Body):', config.data);
      console.groupEnd();
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de Resposta (Response): Registra sucessos e erros formatados
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.group(`✅ [API Response] ${response.config.url}`);
      console.log('Status:', response.status);
      console.log('Data (Response):', response.data);
      console.groupEnd();
    }
    return response;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.group(`❌ [API Error] ${error.config?.url || 'URL Desconhecida'}`);
      console.error('Mensagem:', error.message);
      if (error.response) {
        console.error('Status Code:', error.response.status);
        console.error('Detalhes do Erro:', error.response.data);
      }
      console.groupEnd();
    }
    return Promise.reject(error);
  }
);

export default api;
