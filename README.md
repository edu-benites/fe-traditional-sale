# fe-traditional-sale
Aplicação de venda da modalidade tradicional

## Ambientes

Execute `npm run env:setup` para criar o `.env` a partir do exemplo sem sobrescrever um arquivo existente. Depois ajuste as variáveis do ambiente alvo. O `.env` é lido pelo processo do BFF, não pelo Vite.

- `MAG_API_BASE_URL`, `MAG_AUTH_BASE_URL` e `OUTSYSTEMS_BASE_URL`: hosts das integrações, somente no servidor.
- `MAG_AUTH_CLIENT_ID`, `MAG_AUTH_CLIENT_SECRET` e `MAG_AUTH_SCOPE`: credenciais OAuth, somente no servidor.
- `MAG_API_TOKEN`: token temporário opcional, somente no servidor.
- `BFF_DATABASE_PATH`: caminho do SQLite local usado para registrar propostas.

O BFF expõe apenas rotas relativas `/bff/*`, injeta o token no servidor e faz o CRUD do Supabase sem expor a service role key ao navegador. Não coloque credenciais em variáveis `VITE_*`.

## Desenvolvimento

Execute o BFF e o Vite juntos. O script encontra portas livres automaticamente:

```bash
npm run env:setup
npm run dev:all
```

O terminal exibirá as URLs do BFF e do frontend. Também é possível iniciar o mesmo fluxo com `npm run all`.

`npm run env:check` valida hosts e credenciais OAuth sem imprimir os valores. Para trocar de ambiente, altere apenas o `.env`; o frontend não precisa ser recompilado por causa dos hosts do BFF.

O comando equivalente no padrão solicitado é `npm run run dev all`.

O modo OAuth é o padrão. Preencha `MAG_AUTH_CLIENT_ID`, `MAG_AUTH_CLIENT_SECRET` e `MAG_AUTH_SCOPE`. `MAG_API_TOKEN` deve permanecer vazio e só deve ser usado temporariamente quando houver um token operacional já emitido. Nunca coloque `MAG_*`, `SUPABASE_SERVICE_ROLE_KEY` ou qualquer segredo em `VITE_*`.

Para validar o pacote de um ambiente:

```bash
npm run build
npm run start
```
