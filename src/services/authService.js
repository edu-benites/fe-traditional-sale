// src/services/authService.js
import axios from 'axios';
import {
  AUTH_BASE_URL,
  AUTH_CLIENT_ID,
  AUTH_CLIENT_SECRET,
  AUTH_SCOPE,
} from './integrationConfig';

export const generateSensediaToken = async () => {
  const params = new URLSearchParams();
  params.append('client_id', AUTH_CLIENT_ID);
  params.append('client_secret', AUTH_CLIENT_SECRET);
  params.append('scope', AUTH_SCOPE);
  params.append('grant_type', 'client_credentials');

  const response = await axios.post(
    `${AUTH_BASE_URL}/connect/token`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data;
};
