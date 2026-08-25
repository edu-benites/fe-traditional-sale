import axios from 'axios';
import { API_BASE_URL, getApiAccessToken } from './integrationConfig';

// Criação da instância base do Axios para o projeto MAG
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor de Requisição (Request): Injeta o Token e registra logs em DEV
api.interceptors.request.use(
  (config) => {
    // 1. Injeção segura do Token de Autenticação
    // Usa a chave padrão do projeto: '@Mag:sensedia_token'
    const token = getApiAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Log corporativo para debug (Substituto do Service Center) - Apenas em ambiente DEV
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
