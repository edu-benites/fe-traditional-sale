// src/services/authService.js
import axios from 'axios';

export const generateSensediaToken = async () => {
  const params = new URLSearchParams();
  params.append('client_id', 'usr_cap_api_hmg');
  params.append('client_secret', 'SajIys6TyFZZHGqA');
  params.append('scope', 'cap.api');
  params.append('grant_type', 'client_credentials');

  const response = await axios.post(
    'https://apis-hmg.magcap.com.br/connect/token',
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data;
};