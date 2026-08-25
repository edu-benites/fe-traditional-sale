# fe-traditional-sale
Aplicação de venda da modalidade tradicional

## Ambientes

Copie `.env.example` para `.env` e ajuste as variáveis do ambiente alvo antes de executar o build.

- `VITE_API_BASE_URL`: host das APIs MAG.
- `VITE_AUTH_BASE_URL`: host OAuth, quando diferente da API MAG.
- `VITE_OUTSYSTEMS_BASE_URL`: host/base da integração de ofertas.
- `VITE_AUTH_CLIENT_ID`, `VITE_AUTH_CLIENT_SECRET` e `VITE_AUTH_SCOPE`: credenciais da geração do token.
- `VITE_API_TOKEN`: token temporário de contingência; o token em `@Mag:sensedia_token` tem prioridade.

As variáveis `VITE_*` são incorporadas ao bundle do navegador. A geração do token deve ser movida para um backend antes da produção para manter o `client_secret` protegido.

Para validar o pacote de um ambiente:

```bash
npm run build
```
