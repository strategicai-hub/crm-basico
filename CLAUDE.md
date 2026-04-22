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
- Etapas do pipeline: persistidas no banco (tabela `stages`) e consumidas via `GET /api/stages`

**Infraestrutura:**
- Docker Swarm + Traefik (HTTPS automático via Let's Encrypt)
- Portainer para gerenciamento da stack
- Stack ID no Portainer: `58`

## Google Drive (uploads do onboarding)

Autenticação via `google.auth.JWT` (mesmo padrão do repo `strategicai-hub/help-sai`). Duas envs obrigatórias no stack (Portainer):

- `GOOGLE_SERVICE_ACCOUNT_JSON` — JSON completo da Service Account, em uma linha.
- `GOOGLE_DRIVE_FOLDER_ID` — ID da pasta raiz do Drive compartilhada com o email da SA.

Código: [backend/src/services/google-drive.service.ts](backend/src/services/google-drive.service.ts). Quando um formulário de onboarding é aberto ou recebe upload, o backend cria automaticamente a subpasta do cliente se `driveFolderId` estiver vazio (via `ensureDriveFolder` em `onboarding-forms.service.ts`).

## Banco de dados

Modelos principais: `User`, `Client`, `Deal`, `Stage`, `Task`, `Activity`, `RefreshToken`

- `Stage` é uma tabela do banco com `id`, `key` (único), `label`, `color`, `position` e `type` (`OPEN` | `WON` | `LOST`). As etapas são compartilhadas entre todos os usuários.
- `Deal.stageId` é FK para `Stage`. Não existe mais o enum `DealStage`.
- O `type` da etapa define a semântica para o dashboard: `OPEN` = pipeline aberto, `WON` = venda ganha (conta em vendas por mês), `LOST` = perdida.
- O seed (`backend/src/seed.ts`) popula 5 etapas iniciais (`LEAD`, `PROPOSTA`, `NEGOCIACAO`, `FECHADO_GANHO`, `FECHADO_PERDIDO`) apenas se a tabela estiver vazia.

## Migrations do Prisma

- O backend usa `prisma migrate deploy` no startup (ver `backend/Dockerfile`). Migrations ficam em `backend/prisma/migrations/`.
- Para criar uma migration nova em dev: `cd backend && npx prisma migrate dev --name <nome>`.
- Em prod, `migrate deploy` aplica automaticamente qualquer migration pendente. Não usar mais `prisma db push`.

## Rotas de API relevantes

```
GET  /api/users/minimal   — lista {id, name} de usuários ativos (só autenticado, sem ADMIN)
GET  /api/users           — lista usuários (ADMIN)
POST /api/users           — cria usuário (ADMIN)

GET  /api/clients         — lista clientes
GET  /api/deals           — lista deals agrupados por stageId
PATCH /api/deals/:id      — atualiza deal (title, value, stageId, ownerId)
PATCH /api/deals/:id/stage — move deal de etapa/posição (body: { stageId, position })

GET  /api/stages          — lista etapas (autenticado)
POST /api/stages          — cria etapa (ADMIN) body: { label, color, type }
PATCH /api/stages/:id     — atualiza etapa (ADMIN)
PATCH /api/stages/reorder — reordena (ADMIN) body: { ids: string[] }
DELETE /api/stages/:id    — remove etapa (ADMIN); 409 se houver deals na etapa
```

## Observações importantes

- A rota `/users/minimal` deve estar **antes** do `router.use(requireRole('ADMIN'))` no arquivo de rotas. Mesmo padrão na rota `GET /api/stages`, que é autenticada, mas as mutações são ADMIN-only.
- Chaves legadas `crm_stages` e `crm_stage_config` no localStorage são limpas automaticamente ao carregar o pipeline (etapas agora vivem no banco).
- As imagens de branding ficam em `frontend/public/`: `sai-crm.png` (sidebar) e `favicon-sai.png` (favicon).

## Tom e idioma

- Responder sempre em português brasileiro.
- Respostas curtas e diretas.
- Não usar emojis a menos que solicitado.
