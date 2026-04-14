# SAI CRM — Instruções do projeto

## Regra obrigatória: commit, push e deploy

Antes de qualquer operação de commit, push ou redeploy, perguntar ao usuário:

> "Quer que eu faça commit, push e deploy agora?"

Aguardar confirmação explícita. Nunca executar essas operações de forma automática.

## Commit e push

```bash
cd crm-basico
git add <arquivos>
git commit -m "mensagem"
git push https://gustavocastilho-hub:<GITHUB_TOKEN>@github.com/gustavocastilho-hub/crm-basico.git master
```

Credenciais em `.env` na raiz (nunca commitado).

## Deploy

O deploy é feito via webhook do Portainer (aciona git pull + rebuild + restart da stack):

```bash
curl -sk -X POST "https://91.98.64.92:9443/api/stacks/webhooks/b01ca594-c3be-4258-a2eb-9e60fe689371"
# Retorno esperado: HTTP 204
```

Para verificar os containers após o deploy:

```bash
curl -sk -H "X-API-Key: <PORTAINER_TOKEN>" \
  "https://91.98.64.92:9443/api/endpoints/1/docker/containers/json?filters=%7B%22name%22%3A%5B%22crm%22%5D%7D"
```

Containers esperados: `crm-basico_backend`, `crm-basico_frontend`, `crm-basico_postgres` — todos com state `running`.

URL de produção: `https://crm-basico.strategicai.com.br`

## Fluxo completo (commit → push → deploy → check)

1. `git commit` com mensagem em português
2. `git push` com token do GitHub
3. Webhook Portainer (HTTP 204 = sucesso)
4. Aguardar ~2 minutos e verificar containers via API do Portainer

## CI/CD (GitHub Actions)

O workflow `.github/workflows/docker-publish.yml` roda a cada push na branch `master`:
1. Valida TypeScript do backend (`npx tsc --noEmit`)
2. Build e push das imagens Docker para o GHCR:
   - `ghcr.io/gustavocastilho-hub/crm-basico-backend:latest`
   - `ghcr.io/gustavocastilho-hub/crm-basico-frontend:latest`
3. Aciona o webhook do Portainer se o secret `PORTAINER_WEBHOOK_URL` estiver configurado

**Atenção:** o secret `secrets` não pode ser acessado diretamente em condições `if:` do GitHub Actions. Sempre passar como `env:` no step e usar `env.VAR` na condição.

## Stack técnica

**Backend** (`backend/`):
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- Autenticação JWT (access token + refresh token)
- Roles: `ADMIN` e `USER`

**Frontend** (`frontend/`):
- React + TypeScript + Vite
- Tailwind CSS
- React Router v6
- @hello-pangea/dnd (drag and drop no Kanban)
- Estado global: Zustand (`authStore`)
- Estado de etapas do pipeline: localStorage (`crm_stages`)

**Infraestrutura:**
- Docker Swarm + Traefik (HTTPS automático via Let's Encrypt)
- Portainer para gerenciamento da stack
- Stack ID no Portainer: `58`

## Banco de dados

Modelos principais: `User`, `Client`, `Deal`, `Task`, `Activity`, `RefreshToken`

O campo `stage` de `Deal` é um enum fixo no banco: `LEAD`, `PROPOSTA`, `NEGOCIACAO`, `FECHADO_GANHO`, `FECHADO_PERDIDO`.

Os rótulos e cores das etapas do pipeline são customizáveis **apenas no frontend** via localStorage (`crm_stages`). O banco sempre armazena as chaves do enum.

## Rotas de API relevantes

```
GET  /api/users/minimal   — lista {id, name} de usuários ativos (só autenticado, sem ADMIN)
GET  /api/users           — lista usuários (ADMIN)
POST /api/users           — cria usuário (ADMIN)

GET  /api/clients         — lista clientes
GET  /api/deals           — lista deals agrupados por stage
PATCH /api/deals/:id      — atualiza deal (title, value, stage, ownerId)
PATCH /api/deals/:id/move — move deal de stage/posição
```

## Observações importantes

- A rota `/users/minimal` deve estar **antes** do `router.use(requireRole('ADMIN'))` no arquivo de rotas.
- O localStorage usa a chave `crm_stages` para persistir a configuração de etapas do pipeline. A chave legada `crm_stage_config` foi removida — se existir no browser, é limpa automaticamente ao carregar a página.
- As imagens de branding ficam em `frontend/public/`: `sai-crm.png` (sidebar) e `favicon-sai.png` (favicon).

## Tom e idioma

- Responder sempre em português brasileiro.
- Respostas curtas e diretas.
- Não usar emojis a menos que solicitado.
