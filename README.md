# Fluxo - Controle de gastos

Aplicação web para acompanhar uma receita mensal, os gastos acumulados e o limite diário planejado ao longo de 30 dias.

Também inclui uma tela de metas que calcula quanto guardar por mês, apresenta a evolução acumulada e ajusta os centavos finais para atingir exatamente o valor desejado no prazo escolhido.

## Interface visual
<img width="1262" height="593" alt="image" src="https://github.com/user-attachments/assets/5eef0e91-b739-4e0a-9ae8-cdec1d8654a2" />
<img width="1261" height="593" alt="image" src="https://github.com/user-attachments/assets/ec9430c7-e32a-4840-b0b0-45e2607a3ae8" />
<img width="1262" height="593" alt="image" src="https://github.com/user-attachments/assets/e16a4a27-b07e-42e8-8f95-6e500d3e5798" />

## O que foi corrigido nesta versão

- O frontend agora mostra o erro real retornado pela API, em vez de apenas exibir uma mensagem genérica.
- Foi criado o endpoint `/api/health` para testar se a API está respondendo.
- A conexão com MongoDB foi centralizada em `src/config/database.js` e reaproveitada entre requisições.
- Foi adicionado `api/index.js` e `vercel.json` para deploy em Vercel com rotas `/api/*` funcionando.
- O projeto foi limpo para não versionar `.env`, `.git` e `node_modules`.

## Como executar localmente

1. Copie `.env.example` para `.env`.
2. Preencha `MONGODB_URI` com sua string do MongoDB Atlas.
3. Instale as dependências:

```bash
npm install
```

4. Rode os testes:

```bash
npm test
```

5. Inicie o servidor:

```bash
npm start
```

6. Acesse `http://localhost:3000`.

## Como testar o deploy

Depois de publicar, abra:

```text
https://SEU-DOMINIO/api/health
```

Se a API estiver funcionando, deve aparecer um JSON semelhante a:

```json
{ "ok": true, "mongodbConfigured": true }
```

Se `mongodbConfigured` estiver `false`, configure a variável `MONGODB_URI` no painel do deploy.

## Regras principais

- Restante total = receita mensal − gastos do mês.
- Limite diário = receita mensal ÷ 30.
- Restante planejado do dia = receita mensal − (limite diário × número do dia).
- Saldo diário = restante total − restante planejado do dia.

Os valores são calculados internamente em centavos para evitar erros de ponto flutuante.

## Importante sobre segurança

A string real do MongoDB não deve ficar no código, no README nem no repositório. Use apenas variáveis de ambiente no servidor/deploy.
