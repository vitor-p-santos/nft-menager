# Kurio: NFT Marketplace

Marketplace de NFTs da marca Kurio, implementado a partir do Figma do desafio com React 19, TypeScript (strict), Vite, TanStack Router e Query, Axios, Socket.IO, Tailwind 4, shadcn/ui, React Hook Form + Zod e MSW 2.x. Os testes usam Playwright (e2e, visual e a11y com axe) e a auditoria de performance usa Lighthouse.

Não há servidor real: a API REST e o Socket.IO são simulados no navegador pelo MSW (`@mswjs/socket.io-binding` para o tempo real), inclusive no deploy.

**URL pública:** <https://nft-marketplace-ten-weld.vercel.app>

Status das tarefas em [`TASKS.md`](TASKS.md). Revisão dos requisitos contra o código em [`reports/REQUIREMENTS.md`](reports/REQUIREMENTS.md). Bugs conhecidos, ainda não corrigidos, em [`reports/BUGS.md`](reports/BUGS.md).

## Requisitos
- Node ≥ 22 e npm 10
- Chromium do Playwright (testes e Lighthouse): `npx playwright install chromium`

```bash
npm ci
npm run dev -- --port 5180   # http://localhost:5180
```

## Comandos
| Comando | O que faz |
|---|---|
| `npm run dev -- --port 5180` | Servidor de desenvolvimento com o MSW ativo. A porta padrão (5173) pode estar ocupada por outro processo; por isso o projeto usa 5180. |
| `npm run build` | `tsc -b` + build de produção em `dist/` |
| `npm run preview` | Serve o build em http://localhost:4173 (o MSW também roda no build) |
| `npm run typecheck` | `tsc -b` (app, configs Node e testes) |
| `npm run lint` | oxlint (react, typescript, jsx-a11y, import) |
| `npm run check` | typecheck + lint + build |
| `npm run test:e2e` | Playwright: fluxos (`tests/e2e`) e acessibilidade (`tests/a11y`) em 390, 768 e 1440 px |
| `npm run test:visual` | Testes visuais contra as baselines versionadas (`tests/visual/__screenshots__`) |
| `npm run test:visual:update` | Regenera as baselines |
| `npm test` | Toda a suíte Playwright |
| `npm run test:report` | Abre o relatório HTML do Playwright (`reports/playwright`) |
| `npm run lighthouse` | Build + Lighthouse 3× por página e perfil (mobile/desktop). Medianas de LCP, CLS e TBT em `reports/lighthouse/SUMMARY.md`. As páginas ficam em `lighthouse/pages.json`. |
| `npm run images` | Gera as variantes AVIF/WebP (128 a 960 px) dos PNGs de `public/images/nfts` em `public/images/nfts/opt/` e o manifesto `src/lib/image/manifest.gen.ts` (sharp) |

O Playwright sobe sozinho `npm run build && npm run preview` (porta 4173) e reaproveita um preview já em execução fora do CI. Se o preview estiver servindo um `dist/` antigo, encerre-o antes de rodar os testes.

**CI:** `.github/workflows/ci.yml` roda `check`, a suíte Playwright e o Lighthouse (falha se a mediana de CLS passar de 0,1) em todo PR e push na `main`; os relatórios ficam como artefatos do run.

### Variáveis de ambiente (`.env.example`)
| Variável | Padrão | Uso |
|---|---|---|
| `VITE_API_URL` | `/api` | Base da API REST (interceptada pelo MSW) |
| `VITE_SOCKET_URL` | mesma origem | URL do Socket.IO (interceptada pelo MSW) |
| `VITE_ENABLE_MOCKS` | `true` | `false` desliga o MSW |

## Usuários de teste
| Usuário | E-mail | Senha | Login social simulado | Observação |
|---|---|---|---|---|
| Ana | `ana@kurio.dev` | `Senha@123` | Google | Tem carteiras salvas e histórico de pedidos (10 confirmados, 1 recusado, 1 pendente) |
| Bruno | `bruno@kurio.dev` | `Senha@123` | Facebook | Começa sem carteiras e sem pedidos |

O login social (Google/Facebook) é um OAuth simulado: `POST /auth/oauth/:provider` autentica o usuário de fixture vinculado ao provedor. "Esqueceu a senha?" responde de forma neutra (`202`), exista ou não o e-mail.

Cupons: `KURIO10` (10%), `LANCAMENTO` (0,05 ETH a partir de 1 ETH) e `EXPIRADO` (sempre recusado).

O banco simulado fica no `localStorage` (`mockdb:*`) e é recriado a partir das fixtures quando o `SCHEMA_VERSION` muda. Para voltar ao estado inicial, limpe o `localStorage` do site.

## Cenários da API simulada (`?mock=`)
Cada endpoint passa por `withScenario(chave, ...)` (`src/mocks/scenarios/index.ts`). O cenário pode ser forçado pela URL ou pelo `localStorage`, e a URL tem prioridade:

```
http://localhost:5180/?mock=checkout.create:timeout,catalog.list:latency
localStorage.setItem('mock:scenarios', '{"*":"unavailable"}')   // "*" vale para todos os endpoints
```

| Cenário | Efeito |
|---|---|
| `success` | Padrão: resposta normal com o atraso curto do MSW |
| `failure` | 500 `internal_error` |
| `latency` | Resposta normal depois de +2,5 s |
| `timeout` | A resposta chega depois do timeout do client (10 s) |
| `conflict` | 409 genérico; em `checkout.quote` e `checkout.create` é uma regra real (o preço do 1º item sobe 5%) |
| `unavailable` | 503 `service_unavailable` |

**Chaves de endpoint:**

| Domínio | Chaves |
|---|---|
| Sistema | `system.health` |
| Auth | `auth.register`, `auth.login`, `auth.oauth`, `auth.logout`, `auth.me`, `auth.reset` |
| Catálogo | `catalog.list`, `catalog.detail`, `catalog.related`, `catalog.reviews` |
| Conteúdo | `content.home`, `content.site`, `content.page`, `content.newsletter` |
| Favoritos | `favorites.list`, `favorites.add`, `favorites.remove` |
| Carrinho | `cart.get`, `cart.add`, `cart.update`, `cart.remove`, `cart.coupon`, `cart.merge` |
| Checkout e pedidos | `checkout.quote`, `checkout.create`, `orders.list`, `orders.detail`, `orders.recover`, `orders.receipt` |
| Perfil | `profile.get`, `profile.update`, `profile.avatar`, `profile.password` |
| Carteiras | `wallets.list`, `wallets.create`, `wallets.update`, `wallets.remove`, `wallets.primary` |

**Chaves com valores próprios** (fora dos seis cenários):

| Chave | Valores | Efeito |
|---|---|---|
| `auth.session` | `expired` | Toda requisição com token responde 401 `session_expired` |
| `payment.outcome` | `confirm` (padrão), `reject`, `hold` | Resultado do pagamento simulado; `hold` deixa o pedido `pending` |
| `payment.delay` | milissegundos (ex.: `300`) | Duração do pagamento (padrão 1,5 a 4 s) |

**Sessão:** o token vale 15 min. Para testar a expiração, encurte a validade com `?sessionTtl=5` (segundos) ou `localStorage['mock:session-ttl']`.

Exemplos:
- `/checkout?mock=checkout.create:timeout`: o pedido é criado, a resposta se perde e o app o recupera pela `Idempotency-Key`.
- `/checkout?mock=payment.outcome:reject`: pagamento recusado, carrinho mantido.
- `/?mock=catalog.list:failure`: estado de erro do catálogo com "Tentar novamente".

Detalhes de cada rota, payloads e erros em [`contracts/rest-api.md`](specs/001-nft-marketplace/contracts/rest-api.md).

## Tempo real e `window.__mockRealtime`
O mock do Socket.IO emite `nft.updated` (público) e `order.updated` (só para o dono do pedido), com envelope `{eventId, entityId, version, emittedAt}`. O client descarta duplicatas e versões antigas (`VersionGate`), mostra um indicador discreto quando a conexão cai e refaz as queries afetadas ao reconectar. Contrato em [`contracts/socket-events.md`](specs/001-nft-marketplace/contracts/socket-events.md).

`window.__mockRealtime` existe em dev, quando o navegador é controlado pelo Playwright (`navigator.webdriver`) ou com `localStorage['mock:realtime-tools'] = 'on'`. No deploy ele não fica disponível para o visitante comum.

| Função | Efeito |
|---|---|
| `stats()` | Conexões desta aba (`connections`, `authenticated`, `down`) |
| `events()` | Últimos 50 eventos emitidos |
| `emit(name, payload, { userId? })` | Evento arbitrário, sem mudar o banco |
| `emitNftUpdate(nftId, changes)` | Grava a mudança (preço, edições, status) no banco e emite `nft.updated` com `version + 1` |
| `emitOrderUpdate(orderId, 'confirmed' \| 'rejected')` | Conclui um pedido `pending` e emite `order.updated` |
| `emitDuplicate()` | Reenvia o último evento com o mesmo `eventId` (o client deve ignorar) |
| `emitStale(entityId?, overrides?)` | Reenvia o último evento da entidade com `version - 1` (o client deve ignorar) |
| `dropConnection({ downMs? })` | Derruba a conexão; com `downMs`, recusa reconexões nesse intervalo |

Exemplo no console: `__mockRealtime.emitNftUpdate('nft-copper-ape-291', { priceWei: '1500000000000000000' })`.

## Estrutura
```
src/
  app/          bootstrap: providers, router, queryClient, sincronização do tempo real, header/footer/tab bar
  routes/       rotas do TanStack Router (finas: validam search e compõem features)
  features/     catalog, home, nft, cart, checkout, orders, auth, profile, pages
    <feature>/  api/ (keys, queryOptions, mutations) · components/ · schemas/ (Zod) · hooks/
  entities/     schemas e tipos compartilhados (nft, catalog, cart, order, wallet, session)
  components/   ui/ (shadcn e primitivas) · layout/ · feedback/ (skeleton, vazio, erro)
  lib/          api (Axios + ApiError), socket (envelope, VersionGate, conexão), money (wei em bigint), image
  mocks/        handlers/ por domínio · fixtures/ · db/ (persistido e versionado) · scenarios/ · socket/
  styles/       tokens do Figma e estilos globais
tests/          e2e/ · visual/ (baselines em __screenshots__) · a11y/ · fixtures/
lighthouse/     run.mjs e pages.json
scripts/        optimize-images.mjs
specs/          spec-kit: spec, plano, pesquisa/decisões, modelo de dados, contratos, inventário de design
design/figma/   recortes 1:1 de cada frame do Figma (referência visual)
reports/        REQUIREMENTS.md, playwright/ e lighthouse/
```

## Limitações conhecidas
- **Sem backend real.** Os dados vivem no `localStorage` de cada navegador. Cada aba roda o próprio MSW; o tempo real entre abas é repassado por `BroadcastChannel`.
- **Socket.IO simulado:** o binding não suporta long-polling, rooms nem namespaces. O client usa só `websocket` e o isolamento por usuário é filtrado no servidor simulado. O `socket.io-client` só pode ser carregado depois do `worker.start()` (ver `ARCHITECTURE.md`, R-2).
- **Pagamento e carteiras simulados:** não há assinatura de transação nem conexão com MetaMask, WalletConnect ou Coinbase. O `txHash` é gerado pelo mock, e o link "Ver no Etherscan" aponta para um hash inexistente.
- **Bundle:** o MSW (~495 kB) fica no caminho crítico porque ele é a API. Os chunks são baixados em paralelo (ver `ARCHITECTURE.md`, Performance).
- **Bugs conhecidos:** 17 reproduzidos e 6 suspeitos, com passos para reproduzir, em [`reports/BUGS.md`](reports/BUGS.md). O mais grave: a rede do pedido não é validada contra a rede dos NFTs.
- **Fora do escopo ou incompleto** (lista completa em [`reports/REQUIREMENTS.md`](reports/REQUIREMENTS.md)):
  - "Minha coleção" aparece como "Disponível em breve". Os favoritos ficam em "Lista de interesse" (`/perfil/lista-de-interesse`).
  - "Ofertas", "Arquivos baixados" e "Suporte" do menu do perfil ficam ocultos (decisão D-06).
- Divergências pontuais do Figma (assets provisórios, telas sem frame) estão listadas por fase no `ARCHITECTURE.md`.

## Documentação
- [`ARCHITECTURE.md`](ARCHITECTURE.md): camadas, fluxos de dados, decisões por fase e restrições
- Contratos: [REST](specs/001-nft-marketplace/contracts/rest-api.md) e [eventos Socket.IO](specs/001-nft-marketplace/contracts/socket-events.md)
- [`specs/001-nft-marketplace/`](specs/001-nft-marketplace/): [spec](specs/001-nft-marketplace/spec.md), [plano](specs/001-nft-marketplace/plan.md), [pesquisa e decisões](specs/001-nft-marketplace/research.md), [modelo de dados](specs/001-nft-marketplace/data-model.md), [inventário de design](specs/001-nft-marketplace/design-inventory.md)
- [`.specify/memory/constitution.md`](.specify/memory/constitution.md): princípios do projeto
- [`reports/`](reports/): [revisão de requisitos](reports/REQUIREMENTS.md), relatório do Playwright (`reports/playwright/index.html`) e do Lighthouse (`reports/lighthouse/SUMMARY.md`)
- [`TASKS.md`](TASKS.md): checklist com status verificado

## Deploy
Publicado na Vercel: **<https://nft-marketplace-ten-weld.vercel.app>**

- `vercel.json`: `npm run build`, saída em `dist/` e rewrite de SPA que preserva `mockServiceWorker.js` e `assets/`. O MSW também roda em produção e serve os dados.
- `.vercelignore`: o upload deixa de fora o que não entra no build (`reports`, `design`, `dist` local, worktrees em `.claude`).
- Novo deploy de produção: `npx vercel deploy --prod` (exige `vercel login`). As URLs `*-vitors-projects-*.vercel.app` têm a proteção de deploy da Vercel; a URL pública é o alias acima.
- Para rodar a suíte contra o site publicado: `PLAYWRIGHT_BASE_URL=https://nft-marketplace-ten-weld.vercel.app npx playwright test` (sem preview local).
