🤖 Who IA - Backend

Fala! Esse é o backend do Who IA, nosso sistema de monitoramento de reputação.

Abaixo tem tudo que você precisa pra conectar o front. O sistema usa JWT pra tudo, então a primeira missão é fazer o login funcionar.

🚀 Como Rodar

    Clone o repo e instale as dependências:
    Bash

npm install
npx playwright install # Importante pro Scraper funcionar!

Configure o .env (usem a chave do Gemini de vcs e configurem os parametros de login do Banco).

Rode as migrations do banco:
Bash

npx prisma migrate dev

Suba o servidor:
Bash

    npm run dev

    O servidor roda em: http://localhost:3000

🔑 Autenticação (Comece aqui)

Todas as rotas abaixo (exceto login/register) precisam do Header de autorização. Header: Authorization: Bearer <SEU_TOKEN_AQUI>

1. Criar Conta

    Rota: POST /auth/register

    Body:
    JSON

    {
      "email": "dev@teste.com",
      "password": "123"
    }

2. Fazer Login

    Rota: POST /auth/login

    Body: Mesma coisa do register.

    Retorno: Guarda esse token com carinho, você vai usar em tudo.
    JSON

    { "token": "eyJhbGciOiJIUz..." }

🏢 Setup Inicial

Assim que o usuário logar pela primeira vez, ele precisa criar a empresa que vai monitorar.

3. Criar Empresa

    Rota: POST /company

    Header: Bearer Token

    Body:
    JSON

    { "name": "Nome da Empresa para Buscar no Bing" }

4. Ver minha Empresa

    Rota: GET /company/me

    Retorno: Dados da empresa atrelada ao usuário.

🧠 O Motor (Scraper + IA)

Aqui é onde a mágica acontece. Aviso: Essa rota é lenta!

5. Disparar Atualização

    Rota: POST /data/refresh

    O que ela faz: Vai no Bing, busca reclamações da empresa, passa pro Gemini analisar sentimento/tópicos e salva no banco.

    Frontend: Coloca um Loading/Spinner nervoso aqui, porque pode levar uns 30 a 60 segundos.

    Retorno:
    JSON

    { "totalFound": 10, "totalSaved": 10 }

📊 Dashboard (Gráficos e KPIs)

Essas rotas só retornam dados se o usuário já tiver rodado o /data/refresh antes.

6. Cards de Estatísticas (KPIs)

    Rota: GET /dashboard/stats

    Query Params: ?period=30 (Padrão é 30 dias)

    Retorno:
    JSON

    {
      "period": "30 dias",
      "total": 15,
      "positive": 5,
      "negative": 10,
      "neutral": 0
    }

7. Nuvem de Tópicos

    Rota: GET /dashboard/topics

    Query Params: ?period=30

    Retorno: Um objeto onde a chave é o tópico e o valor é a contagem.
    JSON

    {
      "topics": {
        "entrega": 5,
        "atendimento": 3,
        "produto quebrado": 2
      }
    }

8. Feed de Reclamações (Lista)

    Rota: GET /dashboard/feed

    Query Params:

        page: Número da página (começa em 1).

        limit: Itens por página (padrão 10).

        sentiment: Filtrar por POSITIVE, NEGATIVE ou NEUTRAL (opcional).

    Exemplo: GET /dashboard/feed?page=1&sentiment=NEGATIVE

    Retorno:
    JSON

    {
      "data": [ ...array de reclamações... ],
      "meta": { "total": 50, "page": 1, "lastPage": 5 }
    }

🆘 Tive um Erro, e agora? (Troubleshooting)

Se o back-end explodir na sua cara, provavelmente é um desses motivos:

1. Erro 500 no /data/refresh (Timeout ou Playwright)

    Causa: O scraper não conseguiu abrir o navegador ou o Bing bloqueou.

    Solução: Tenta rodar de novo. Se persistir, avisa o Gustavo pra checar se o npx playwright install foi rodado no servidor.

2. Erro de API Key (Gemini)

    Erro no log: API key not valid ou 404 Not Found.

    Solução: A chave do Google Gemini no .env expirou ou está errada.

3. Erro "Cannot find name 'Sentiment'" ou erros de banco

    Solução: Sempre que mexer no banco, tem que rodar npx prisma generate pra atualizar os tipos do TypeScript.

4. Token Inválido (401 Unauthorized)

    Solução: O token JWT expira em 1 dia. Se der erro 401, faz logout no front e manda o usuário logar de novo.