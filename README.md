# LOBAE° Prospector

Painel web local para **encontrar pequenos negócios sem site** e fazer o **primeiro contato pelo WhatsApp**, com mensagens personalizadas a partir das avaliações do Google.

> 🚧 Em construção, fase por fase. Veja o [roteiro](#roteiro).

## O problema

Muito negócio de bairro (barbearia, doceria, oficina) tem nota alta e centenas de avaliações no Google, mas nenhum site, ou só um Instagram. Achar esses negócios na mão é lento, e mandar mensagem genérica não funciona.

O Prospector automatiza a parte chata e deixa a parte humana com quem prospecta:

1. **Busca** negócios por segmento + cidade (Google Places).
2. **Filtra** quem não tem site ou tem um site ruim (PageSpeed).
3. **Qualifica** com IA: lê as avaliações, dá uma nota e escreve uma mensagem específica pra aquele negócio.
4. **Abre o WhatsApp** com a mensagem pronta. **O envio é manual**, de propósito.
5. **Acompanha o funil** (kanban, follow-ups, notas).

## Demo

![Tela inicial com contadores do funil (dados fictícios)](docs/fase-0-home.jpg)

_Todos os dados nos prints são fictícios (seed). O GIF do fluxo completo entra quando a Fase 4 estiver pronta._

## Arquitetura

```mermaid
flowchart LR
  U([Navegador]) -->|localhost:3000| W["web · Next.js<br/>só front"]
  W -->|"rewrite /api/* → :3333"| A["api · Express + TS<br/>valida com zod"]
  A -->|Prisma| DB[("PostgreSQL<br/>Docker :5434")]
  A -.->|Fases 1–3| G["Google Places<br/>+ PageSpeed"]
  A -.->|Fase 3| C["Claude API"]
  U -.->|"Fase 4: link wa.me<br/>envio manual"| WA["WhatsApp Business"]
```

- **`/web`**: Next.js (App Router). Não tem banco nem chaves; só desenha a tela e consome a API com TanStack Query.
- **`/api`**: Express + TypeScript. É o **único** lugar que fala com o banco e com APIs externas, e o único que conhece as chaves.
- **Postgres** roda no Docker; o schema evolui por **migrations versionadas** do Prisma.

## Stack

| Camada | Tecnologias |
| --- | --- |
| Front | Next.js 16, React 19, TypeScript, TanStack Query, CSS Modules, `next/font` (Host Grotesk + Silkscreen) |
| API | Node 22, Express 5, TypeScript, zod, Prisma 7 (driver adapter `pg`) |
| Banco | PostgreSQL 17 (docker-compose) |
| Testes | Vitest + Supertest |
| Monorepo | npm workspaces + concurrently |

## Como rodar

**Pré-requisitos:** Node 22+ e Docker Desktop aberto.

```bash
# 1. dependências (instala api e web de uma vez, via workspaces)
npm install

# 2. variáveis de ambiente da API
cp api/.env.example api/.env

# 3. sobe o Postgres e aplica as migrations
npm run db:up
npm run db:migrate

# 4. (opcional) dados fictícios pra ver a tela preenchida
npm run db:seed

# 5. API (:3333) + web (:3000) juntas
npm run dev
```

Abra http://localhost:3000.

### Controle de gastos

O projeto foi pensado para custar quase nada:

| Variável (`api/.env`) | Padrão | Para quê |
| --- | --- | --- |
| `GOOGLE_MONTHLY_CALL_LIMIT` | `200` | Máximo de chamadas pagas ao Google por mês. Depois disso a API recusa com 429. |
| `GOOGLE_MAX_PAGES_PER_SEARCH` | `3` | Teto de páginas por busca (1 página = 1 chamada = até 20 negócios). |
| `ANTHROPIC_MODEL` | `claude-haiku-5-5` | O modelo mais barato do Claude, usado na qualificação (Fase 3). |

O contador fica no banco (tabela `ApiUsage`) e aparece na tela. Como segunda proteção, vale também definir um **limite de cota diário** para a Places API e um **alerta de orçamento** direto no Google Cloud Console.

### Scripts (na raiz)

| Script | O que faz |
| --- | --- |
| `npm run dev` | sobe API e web juntas, com logs coloridos |
| `npm run db:up` / `db:down` | liga/desliga o Postgres no Docker |
| `npm run db:migrate` | cria/aplica migrations (`prisma migrate dev`) |
| `npm run db:seed` | insere leads fictícios (pode rodar várias vezes, não duplica) |
| `npm test` | testes da API |
| `npm run typecheck` | checa os tipos de API e web |

### Rotas da API

| Rota | Fase | Status |
| --- | --- | --- |
| `GET /health` | 0 | ✅ |
| `GET /leads/stats` | 0 | ✅ |
| `POST /search` | 1 | ✅ |
| `GET /usage` (cota do Google no mês) | 1 | ✅ |
| `GET /leads`, `PATCH /leads/:id`, `POST /leads/:id/pagespeed` | 2 | ⏳ |
| `POST /leads/:id/qualify`, `POST /leads/qualify` | 3 | ⏳ |
| `POST /leads/:id/contacted` | 4 | ⏳ |
| `GET /leads/followups/today` | 5 | ⏳ |

## Estrutura

```
.
├── docker-compose.yml        # Postgres
├── package.json              # workspaces + scripts da raiz
├── api/
│   ├── prisma/
│   │   ├── schema.prisma     # modelo Lead + enums
│   │   ├── migrations/       # histórico versionado do banco
│   │   └── seed.ts           # dados FICTÍCIOS
│   ├── prisma.config.ts      # config da CLI do Prisma 7
│   └── src/
│       ├── app.ts            # monta o Express (testável sem abrir porta)
│       ├── server.ts         # sobe na porta
│       ├── env.ts            # valida variáveis de ambiente com zod
│       ├── lib/              # prisma, regras puras (ex: stats)
│       └── routes/           # health, leads
└── web/
    ├── next.config.ts        # rewrite /api/* → API
    ├── app/                  # layout, providers, página inicial
    ├── components/           # StatusOverview, ApiStatus
    └── lib/                  # cliente HTTP, tipos, metadados de status
```

## Decisões

**Por que o envio do WhatsApp é manual?**
Automatizar com bibliotecas não oficiais (Baileys, whatsapp-web.js) viola os termos do WhatsApp e é o caminho mais rápido pra ter o número banido. O app faz o trabalho pesado (achar, qualificar, escrever) e entrega um link `wa.me` com a mensagem pronta; quem aperta "enviar" é uma pessoa, no WhatsApp Business. Isso também força uma revisão humana de cada mensagem antes de sair.

**Por que field mask na Google Places API?**
Na Places API (New), o preço de cada chamada depende dos campos pedidos: a requisição é cobrada pela faixa (SKU) do campo mais caro da lista. Sem field mask a API recusa a chamada, e com `*` você paga a faixa máxima por dados que nem usa. Pedir só o que o app precisa (`id`, nome, endereço, telefone, site, nota, nº de avaliações, link do Maps) evita subir de faixa sem necessidade, deixa a resposta menor e documenta no código de quais dados o app depende.

**Por que validar a saída da IA com zod?**
Modelo de linguagem não é contrato: mesmo pedindo JSON, a resposta pode vir com campo faltando, nota fora de 0–100 ou texto onde era número. Validar com zod antes de salvar garante que o banco só recebe dado no formato certo e transforma "a IA respondeu algo estranho" num erro claro, em vez de um bug silencioso na tela.

**Por que contar as chamadas ao Google no banco?**
Um limite só na memória zera toda vez que a API reinicia (e em dev ela reinicia a cada arquivo salvo). No banco, o contador sobrevive. A "reserva" de uma chamada é um único `UPDATE ... WHERE calls < limite`: o próprio Postgres confere e soma no mesmo passo, então nem duas buscas simultâneas furam o limite. A chamada é contada **antes** de ir ao Google; se o Google falhar, ela continua contada (melhor errar para menos).

**Por que, por padrão, a busca não salva quem já tem site?**
O foco do Prospector é quem **não tem site** ou tem **só rede social** (Instagram, Linktree, wa.me...). O Google não deixa filtrar isso na busca e cobra a chamada igual, então o filtro acontece depois de classificar e antes de salvar: o resumo mostra quantos tinham site, mas eles não entram no funil. Dá para desmarcar a opção no formulário (`skipRealSites: false`).

**Por que o upsert não mexe em status e notas?**
Buscar "barbearia em Mogi" de novo atualiza só os dados que vêm do Google (telefone, nota, site...). Status do funil, notas e mensagem são trabalho seu e nunca são sobrescritos por uma busca repetida.

**Por que validar também a resposta do Google com zod?**
Pelo mesmo motivo da IA: é um dado que vem de fora. Se o formato mudar, o erro aparece na hora com uma mensagem clara, em vez de salvar lixo no banco.

**Por que o front chama `/api/*` e o Next repassa (rewrite)?**
O navegador só enxerga uma origem (`localhost:3000`), então não precisa configurar CORS. E as chaves nunca chegam ao front: o `web` não tem `.env` com segredo nenhum.

**Por que migrations versionadas?**
Cada mudança no schema vira um arquivo SQL commitado. Qualquer pessoa (ou eu daqui a seis meses) reconstrói o banco exatamente igual com `npm run db:migrate`, e dá pra ver no histórico do git quando e por que uma coluna surgiu.

**Por que `createApp()` separado de `server.ts`?**
Os testes de rota usam o Supertest direto no app, sem abrir porta, e trocam o Prisma por um dublê. Assim testam o contrato HTTP (status e formato do JSON) em milissegundos, sem precisar de banco.

**Por que `API_PORT` e não `PORT`?**
`PORT` costuma já vir definido no ambiente (launchers, plataformas de deploy) e o Node dá prioridade a ele sobre o `.env`. Na prática isso fez a API subir na porta 3000 e "roubar" a porta do Next. Um nome específico evita a colisão.

**Por que dados fictícios no seed?**
O repositório e os prints são públicos. Os leads de demo usam nomes inventados, DDD `00` (que não existe) e domínios `example.com`/`example.org` (reservados pra exemplo). Leads reais só existem no banco local.

## Testes

```bash
npm test
```

- **Unitários:** regras puras: contadores por status e classificação de `websiteType` (Instagram, Linktree, wa.me... = `social`). Na Fase 4 entra a normalização de telefone.
- **Rotas (Supertest):** status HTTP e formato do JSON de cada rota, com o Prisma e o Google substituídos por dublês. A busca é testada com paginação, lugares repetidos, limite de páginas, cota esgotada e erro do Google, sem gastar nenhuma chamada.

## Roteiro

- [x] **Fase 0, Esqueleto:** monorepo, Postgres, schema + migration, `/health`, `/leads/stats`, tela com contadores
- [x] **Fase 1, Buscar:** segmento + cidade → Google Places, upsert por `placeId`, classificação do site, limite mensal de chamadas
- [ ] **Fase 2, Filtrar:** tabela com filtros + nota PageSpeed
- [ ] **Fase 3, Qualificar:** avaliações → Claude → nota, gancho e mensagem (validados com zod)
- [ ] **Fase 4, Contatar:** mensagem editável + "Abrir no WhatsApp" + follow-up em 3 dias
- [ ] **Fase 5, Funil:** kanban, follow-ups do dia, notas
