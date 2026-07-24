// src/services/api.js
import axios from 'axios';
import { generateSensediaToken } from './authService';

// Aqui você coloca a URL base das suas APIs de negócio (não a de token)
export const api = axios.create({
  baseURL: 'https://apis-hmg.magcap.com.br', // Ajuste para a raiz limpa da API
  timeout: 10000,
});

// O Interceptador de Requisição
api.interceptors.request.use( 
  async (config) => {
    // Tenta buscar o token armazenado localmente para não gerar um novo a cada clique
    let token = localStorage.getItem('@Mag:sensedia_token');

    // Se não existir token no cache do navegador, gera um novo
    if (!token) {
      try {
        const tokenData = await generateSensediaToken();
        token = tokenData.access_token;
        
        // Salva no LocalStorage para reaproveitar nas próximas requisições
        localStorage.setItem('@Mag:sensedia_token', token);
        
        // Opcional: Se a API retornar 'expires_in', você pode salvar o tempo de 
        // expiração para saber quando forçar a geração de um novo token.
      } catch (error) {
        console.error('Falha ao gerar o token do Sensedia:', error);
        // Em um cenário real, você pode redirecionar para uma tela de erro aqui
      }
    }

    // Se conseguiu obter o token, injeta no cabeçalho de Autorização
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);