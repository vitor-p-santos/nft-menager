# Revisão final: requisitos × implementação (T-105)

- **Data:** 2026-10-27
- **Método:** leitura e grep do código em `src/`, `tests/`, `lighthouse/` e configs, contra o [spec](../specs/001-nft-marketplace/spec.md) (US-01 a US-10, NFR-01 a NFR-06) e as seções "Regras de domínio críticas", "Qualidade visual e acessibilidade", "Testes e auditorias" e "Entregáveis" do `CLAUDE.md`.
- **Limite:** nesta revisão nenhum teste foi executado. A coluna "Evidência" aponta onde o requisito está no código e qual teste o cobre. Os resultados de execução citados vêm da última rodada registrada no `PROGRESSO.txt` (e2e + a11y: 42 passed / 0 failed / 27 skipped; visual: 11 passed / 1 failed). O agente frontend ainda estava alterando `src/` durante a revisão (imagens, bundle, tempo real na tela e layout), então os itens marcados como "a reverificar" dependem da rodada final.

Legenda: **OK** = implementado e coberto por teste ou verificação registrada · **Parcial** = implementado sem teste automatizado, ou com uma parte faltando · **Faltando** = não existe.

## Resumo: o que falta ou está parcial

| # | Item | Status | O que falta |
|---|---|---|---|
| 1 | Deploy público (NFR-06, T-104) | Faltando | `vercel.json` existe, mas não há deploy nem URL. A Vercel CLI não está instalada nem logada; o deploy depende do login do usuário. |
| 2 | Relatório Lighthouse (NFR-04, T-102) | Faltando | O script existe (`lighthouse/run.mjs`), mas `reports/lighthouse/` não existe: nenhuma medição foi registrada. |
| 3 | Lighthouse por página | Parcial | `lighthouse/pages.json` só lista `/`. O requisito pede "3 execuções por página × perfil"; detalhe, carrinho e checkout não são auditados. |
| 4 | Lighthouse "em CI" (tabela da stack no `CLAUDE.md`) | Faltando | Não há `.github/workflows` nem `lighthouserc`. O `@lhci/cli` está nas devDependencies e não é usado. |
| 5 | Relatório de testes para a entrega (T-103) | Parcial | `reports/playwright/index.html` é de 2026-10-26 (anterior às fases 5 a 8) e o `.gitignore` ignora `reports/playwright`, então ele não iria na entrega. O comentário do `.gitignore` cita `docs/reports`, que não existe. |
| 6 | E2E do tempo real (US-10, T-095) | Faltando | Não há teste de dedupe, evento antigo, desconexão/reconexão nem de `nft.updated`/`order.updated` na tela. Só verificação por script temporário (fora de `tests/`). |
| 7 | E2E de perfil, senha e carteiras (US-08/US-09, T-088) | Faltando | Telas e handlers existem; não há spec em `tests/`. |
| 8 | Baseline visual "pagamento" mobile e "início" tablet (NFR-05, T-075) | Parcial / a reverificar | Na última rodada, "início" no tablet falhava (+24 px no hero) e o total do checkout em 390 px ficava atrás da barra fixa. A correção do hero está descrita no `ARCHITECTURE.md` (Performance), mas as baselines ainda não foram regeneradas nem reexecutadas. |
| 9 | "Lista de interesse" / Favoritos (US-08) | Parcial | Favoritar funciona (API, coração no card e no detalhe), mas não existe tela de favoritos: o item "Lista de interesse" do menu do perfil, o "Favoritos" da tab bar mobile e "Minha coleção"/"Lista de interesse" do rodapé ficam `aria-disabled` com "Disponível em breve". |
| 10 | Acessibilidade automatizada (NFR-03) | Parcial | axe roda em Home (3 viewports, zero violações), página institucional, detalhe, carrinho, login e cadastro. Checkout, pedido/recibo, atividade, perfil e carteiras não têm auditoria axe. Nas páginas internas o teste só barra violações `serious`/`critical`. |
| 11 | Imagens otimizadas e bundle (T-100/T-101) | Parcial / a reverificar | Implementados (`scripts/optimize-images.mjs`, `responsive-image.tsx`, `vite.config.ts`) e descritos no `ARCHITECTURE.md`, mas o frontend ainda estava trabalhando neles e não há medição Lighthouse depois da mudança. |
| 12 | Repositório sem commits | Faltando (entrega) | `git log` responde "does not have any commits yet". O código, o lockfile e as baselines ainda não estão versionados. |
| 13 | Componentes base shadcn (T-021) | Parcial | Existem Button, Dialog, Sheet, Slider, Tabs, DropdownMenu, Pagination, ConfirmDialog e FormField. Não há Input, Select, Checkbox, Radio nem Badge do shadcn: os formulários usam controles nativos estilizados. Não é requisito do spec, mas é item aberto do checklist. |
| 14 | `queryClient.clear()` na troca de conta (`CLAUDE.md`) | Atendido com outro meio | Foi trocado de propósito por `resetUserData` (reseta só as queries privadas, inclusive as que estão montadas). A decisão está no `ARCHITECTURE.md` ("Autenticação: dados"). Coberto por `tests/e2e/auth.spec.ts` (troca de conta). |

## US-01 Explorar o catálogo

| Requisito | Status | Evidência |
|---|---|---|
| Busca por texto (lupa no header desktop, campo no mobile) | OK | `app/layout/site-header.tsx` (navega com `q`), `features/catalog/components/catalog-search-bar.tsx`, `app/layout/mobile-tab-bar.tsx` (botão central foca a busca); `tests/e2e/catalog.spec.ts` (busca vazia) |
| Filtros combináveis: categorias e redes com contagem, faixa de preço com "Aplicar" | OK | `features/catalog/components/catalog-filters.tsx`, `mocks/handlers/catalog.ts` (facets com `count` que ignora o próprio filtro); `tests/e2e/catalog.spec.ts` ("filtros combinados vão para a URL…") |
| Abas Todos / Novos lançamentos / Em alta | OK | `entities/catalog/search.ts`, `features/catalog/components/catalog-toolbar.tsx` |
| Ordenação (recentes, menor/maior preço, populares) | OK | `entities/catalog/search.ts` (`recent`, `price_asc`, `price_desc`, `popular`), `mocks/handlers/catalog.ts` |
| Paginação numerada com próxima página | OK | `components/ui/pagination.tsx`, `features/catalog/components/catalog-section.tsx` |
| Estado inteiro na URL; mudar filtro volta à página 1 | OK | `entities/catalog/search.ts` (`catalogSearchSchema` com Zod + `.catch`), `features/catalog/hooks/catalog-search.ts` (`mergeCatalogSearch`); `tests/e2e/catalog.spec.ts` (sobrevive ao reload) |
| Cards: imagem, nome, preço, preço riscado, "RARO", ações no hover/foco | OK | `entities/nft/nft-card.tsx`; baseline `tests/visual/home.spec.ts` |
| Facets refletem os filtros aplicados | OK | `mocks/handlers/catalog.ts` (`matches(..., skip)`) |
| Skeleton com shimmer, vazio com "Limpar filtros", erro com "Tentar novamente" | OK | `components/feedback/skeleton.tsx`, `components/feedback/states.tsx`, `features/catalog/components/catalog-section.tsx`; `tests/e2e/catalog.spec.ts` ("erro, skeleton e busca vazia") |
| Mobile: botão de filtros abre um sheet; tab bar inferior | OK | `features/catalog/components/catalog-section.tsx` (Sheet), `app/layout/mobile-tab-bar.tsx` |
| Filtro por criador ("Criadores", D-06) | OK | `site-header.tsx` (links com `creator`), `entities/catalog/search.ts`, facet `creators` no handler |

## US-02 Conteúdo da Home

| Requisito | Status | Evidência |
|---|---|---|
| Hero com carrossel e pontos, CTA "EXPLORAR" rola ao catálogo | OK | `features/home/components/hero-carousel.tsx`, `mocks/fixtures/content.ts` |
| NFT em destaque, 2 promos, blog com 4 posts, newsletter | OK | `features/home/components/featured-nft.tsx`, `promos.tsx`, `blog-section.tsx`, `app/layout/newsletter-form.tsx`, `POST /newsletter` em `mocks/handlers/content.ts` |
| Conteúdo vem da API | OK | `GET /content/home` e `GET /content/site` (`mocks/handlers/content.ts`), `features/home/api/queries.ts` |

## US-03 Detalhe do NFT

| Requisito | Status | Evidência |
|---|---|---|
| Breadcrumb, galeria com miniaturas e zoom | OK | `features/nft/components/nft-detail.tsx` (`<nav aria-label="Trilha de navegação">`), `nft-gallery.tsx` (diálogo de zoom) |
| Preço, avaliação, descrição, edições, ID do token, coleção, atributos | OK | `nft-detail.tsx`, `edition-selector.tsx`, `rating-stars.tsx`, `nft-description-tabs.tsx` |
| Compartilhar | OK | `features/nft/components/share-nft.tsx` (Web Share API + copiar link + LinkedIn/e-mail/X) |
| Abas Detalhes / Avaliações (N), avaliações paginadas | OK | `nft-description-tabs.tsx`, `nft-reviews.tsx`, `GET /nfts/:id/reviews`; `tests/e2e/nft-detail.spec.ts` |
| "Mais desta coleção" | OK | `features/nft/components/related-nfts.tsx`, `entities/nft/nft-carousel.tsx` |
| Quantidade entre 1 e a disponibilidade da edição; servidor revalida | OK | `components/ui/quantity-stepper.tsx`, `mocks/handlers/cart.ts` (`quantity_reduced`); `tests/e2e/nft-detail.spec.ts` ("quantidade limitada…", "edição 1/1 esgotada") |
| "Comprar" adiciona e leva ao carrinho; carrinho mobile só adiciona com feedback | OK | `nft-detail.tsx` (`addToCart(true/false)`, `CartFeedbackMessage`) |
| Favoritar exige login e conclui depois de entrar | OK | `features/nft/hooks/use-favorite.ts`, `entities/session/pending-action.ts`; `tests/e2e/nft-detail.spec.ts`, `tests/e2e/auth.spec.ts` (sessão expirada → favoritar pendente) |
| Preço e disponibilidade em tempo real (`nft.updated`) | Parcial | Patch no cache em `entities/nft/events.ts` e `app/realtime/sync.ts`; sem e2e (ver item 6 do resumo) |
| 404 de NFT inexistente | OK | `tests/e2e/nft-detail.spec.ts` |

## US-04 Carrinho

| Requisito | Status | Evidência |
|---|---|---|
| Itens com imagem, nome, token/edição, preço, quantidade +/−, total da linha, remover | OK | `features/cart/components/cart-items.tsx`; `tests/e2e/cart.spec.ts` |
| Resumo: cupom, subtotal, "Desconto do lançamento", "Taxa de rede", total | OK | `features/cart/components/cart-summary.tsx`, `mocks/fixtures/coupons.ts` |
| "Conectar e finalizar" exige login; "Continuar explorando" | OK | `cart-summary.tsx`, `routes/checkout.tsx` (`requireAuth`); `tests/e2e/checkout.spec.ts` (guarda de rota) |
| Persistência no refresh; anônimo por `X-Cart-Id`, mesclado no login | OK | `lib/api/cart-id.ts`, `mocks/db/carts.ts`, `POST /cart/merge`, `features/auth/api/session.ts`; `tests/e2e/cart.spec.ts` (refresh), `tests/e2e/auth.spec.ts` (merge na troca de conta) |
| Cupom inválido/expirado com erro acessível e valores inalterados | OK | `cart-summary.tsx`, cupom `EXPIRADO`; `tests/e2e/cart.spec.ts` |
| Cálculo exato em wei; servidor é a fonte do total | OK | `lib/money/eth.ts` (bigint), `mocks/handlers/cart.ts` (`priceLines`), `entities/cart/schema.ts` (Zod) |
| Linha sinaliza preço alterado ou indisponível | OK | `cart-items.tsx` (`issue`); `tests/e2e/cart.spec.ts` ("preço alterado no servidor…") |
| Estado vazio com CTA | OK | `features/cart/components/cart-page.tsx` |

## US-05 Checkout

| Requisito | Status | Evidência |
|---|---|---|
| Revisão de itens, cupom, taxa e total | OK | `features/checkout/components/order-review.tsx` |
| Carteira salva ou provedor, "Trocar carteira"; rede da carteira = rede do pedido | OK | `wallet-options.tsx`, `checkout-page.tsx`, `features/checkout/schemas/checkout.ts` |
| Formulário "Perfil do colecionador" com Zod | OK | `collector-form.tsx`, `collectorSchema` (o mesmo schema no handler) |
| Revalidação (`POST /checkout/quote`) com diff e nova confirmação | OK | `hooks/use-checkout-flow.ts`, `quote-changes-dialog.tsx`; `tests/e2e/checkout.spec.ts` ("conflito…") |
| `Idempotency-Key`; duplo clique/retry/refresh não duplicam | OK | `features/checkout/api/attempt.ts`, `api/queries.ts`, `mocks/handlers/checkout.ts`; `tests/e2e/checkout.spec.ts` (duplo clique = 1 pedido) |
| Recuperação após timeout/refresh | OK | `GET /orders/by-key/:key`, `checkoutQueries.recovery`; `tests/e2e/checkout.spec.ts` ("timeout: pedido recuperado…, inclusive após refresh") |
| Confirmação só com `confirmed`; falha mantém o carrinho | OK | `order-status-dialog.tsx`; `tests/e2e/checkout.spec.ts` ("falhas…") |
| 409 em conflito | OK | `mocks/handlers/checkout.ts` (`price_changed`, `out_of_stock`, `quote_expired`, `cart_version_mismatch`) |
| Layout mobile do pagamento | Parcial | Implementado; o total fica atrás da barra fixa em 390 px na última rodada (item 8 do resumo) |

## US-06 Pedidos e recibos

| Requisito | Status | Evidência |
|---|---|---|
| `pending` → `confirmed`/`rejected` por `order.updated` ou polling | OK (polling) / Parcial (socket) | `entities/order/api.ts` (`pendingOrderPollInterval`), `entities/order/realtime.ts`; `tests/e2e/orders.spec.ts` cobre os estados; o caminho pelo socket não tem e2e |
| Recibo com tx, data, total, carteira, itens, taxa, "Ver no Etherscan" | OK | `entities/order/order-receipt.tsx` |
| Recusado: motivo, carrinho mantido, tentar de novo | OK | `features/orders/components/order-page.tsx`, `order-status-dialog.tsx`; `tests/e2e/checkout.spec.ts` |
| Recibo imutável | OK | `receiptsTable.insertOnce` (`mocks/db/orders.ts`), 405 em escrita (`mocks/handlers/checkout.ts`), `receiptSchema.readonly()`; `tests/e2e/orders.spec.ts` (405 no recibo) |
| Lista em "Atividade" com filtro na URL | OK | `routes/atividade.tsx`, `features/orders/components/activity-page.tsx`; `tests/e2e/orders.spec.ts` |

## US-07 Conta e sessão

| Requisito | Status | Evidência |
|---|---|---|
| Cadastro, login (mostrar/ocultar senha), logout | OK | `features/auth/components/*`, `auth-field.tsx` (`aria-pressed`); `tests/e2e/auth.spec.ts` |
| Modal no desktop, página no mobile | OK | `auth-dialog.tsx`, `routes/entrar.tsx`, `routes/cadastro.tsx`; `tests/a11y/auth.spec.ts` |
| Expiração (401 `session_expired`) → login → volta à rota, search e ação pendente | OK | `features/auth/api/session.ts`, `session-expired-handler.tsx`, `use-auth-success.ts`; `tests/e2e/auth.spec.ts` |
| Troca de conta limpa cache, socket e dados privados | OK | `resetUserData` + `resetSocketSession`; `tests/e2e/auth.spec.ts` ("troca de conta…") |
| ≥ 2 usuários de fixture | OK | `mocks/fixtures/users.ts` (Ana e Bruno) |
| OAuth simulado (D-05) e "Esqueceu a senha?" (D-07) | OK, sem e2e | `POST /auth/oauth/:provider`, `POST /auth/password-reset`, `social-buttons.tsx`, `forgot-password-form.tsx` |

## US-08 Perfil e US-09 Carteiras

| Requisito | Status | Evidência |
|---|---|---|
| Menu lateral (Dados, Carteiras, Atividade, Lista de interesse, Sair) | Parcial | `features/profile/components/profile-shell.tsx`; "Lista de interesse" desabilitada (item 9 do resumo); Ofertas/Arquivos/Suporte ocultos por decisão (D-06) |
| Dados do perfil + avatar (Alterar/Remover, prévia, tipo e tamanho) | Parcial (sem e2e) | `profile-page.tsx`, `avatar-field.tsx`, `features/profile/schemas/avatar.ts` (≤ 2 MB + assinatura), `mocks/handlers/profile.ts` |
| Alterar senha (atual, nova, confirmação) | Parcial (sem e2e) | `POST /me/password` (`mocks/handlers/profile.ts`), `changePasswordFormSchema` |
| Carteiras: principal, secundária, "Igual à principal", editar, remover, definir principal | Parcial (sem e2e) | `wallets-page.tsx`, `wallet-form.tsx`, CRUD + `POST /me/wallets/:id/primary` em `mocks/handlers/wallets.ts` |
| Carteiras salvas aparecem no checkout | OK | `entities/wallet` (`walletQueries.list`, mesma key), `wallet-options.tsx` |

## US-10 Tempo real

| Requisito | Status | Evidência |
|---|---|---|
| `nft.updated` e `order.updated` com `eventId` e `version` | OK (código) | `src/mocks/socket/events.ts`, `server.ts`; `entities/nft/events.ts`, `entities/order/events.ts`; contrato em `contracts/socket-events.md` |
| Descartar duplicatas e eventos antigos | Parcial (sem e2e) | `lib/socket/version-gate.ts` + nova comparação de `version` no patch; `__mockRealtime.emitDuplicate/emitStale` prontos, mas sem teste |
| Indicador de desconexão; refetch ao reconectar | Parcial (sem e2e) | `app/layout/realtime-status.tsx` (montado em `app/providers.tsx`), `lib/socket/connection.ts`, `app/realtime/sync.ts` |
| Subscription por usuário, trocada no login/logout | Parcial (sem e2e) | `lib/socket/session.ts`, token validado a cada entrega em `mocks/socket/server.ts` |
| Mock do Socket.IO conectando via MSW | OK | `src/mocks/socket/index.ts` (T-090); verificado por script temporário |

## Requisitos não funcionais

| ID | Requisito | Status | Evidência |
|---|---|---|---|
| NFR-01 | 390/768/1440 sem overflow horizontal | OK | `playwright.config.ts` (3 projetos); `tests/e2e/smoke.spec.ts` (overflow) |
| NFR-02 | CLS ≈ 0 (aspect-ratio, skeletons com a mesma geometria, fonte self-hosted) | Parcial | `width`/`height` nas imagens, `@fontsource-variable/roboto-mono`, skeletons; o CLS **não foi medido** (sem relatório Lighthouse) |
| NFR-03 | WCAG 2.1 AA, teclado, foco visível, `prefers-reduced-motion` | Parcial | `tests/a11y/*` (cobertura no item 10 do resumo); skip-link em `routes/__root.tsx`; reduced motion em `styles/globals.css`, `features/home/hooks/use-reduced-motion.ts`, `realtime-status.tsx` |
| NFR-04 | Lighthouse 3× por página e perfil, medianas de LCP/CLS/TBT | Parcial | O script cumpre o método (`lighthouse/run.mjs`, `RUNS = 3`, mobile/desktop, medianas), mas só para `/`, e nunca foi executado (itens 2 a 4) |
| NFR-05 | Baselines visuais: início, detalhe, carrinho, pagamento | Parcial | As 4 baselines existem em `tests/visual/__screenshots__/{mobile-390,tablet-768,desktop-1440}`; "início" tablet e "pagamento" mobile estão pendentes (item 8) |
| NFR-06 | Deploy público com MSW em produção | Faltando | `vercel.json` e `main.tsx` (MSW em produção salvo `VITE_ENABLE_MOCKS=false`) prontos; sem deploy |

## `CLAUDE.md`: regras de domínio, qualidade e entregáveis

| Requisito | Status | Evidência |
|---|---|---|
| ETH em wei (bigint/string), formatação só na borda | OK | `lib/money/eth.ts`; schemas `Wei` em `entities`; handlers usam string |
| Catálogo na URL com Zod | OK | ver US-01 |
| Carrinho persistente, mantido na falha do pagamento | OK | ver US-04/US-05 |
| Checkout: revalidação, `Idempotency-Key`, recuperação, confirmação só pela API | OK | ver US-05 |
| Pedidos com 3 estados e recibo imutável | OK | ver US-06 |
| Auth com expiração e `redirect` | OK | ver US-07 |
| Socket com `version`, dedupe e reconexão | Parcial | ver US-10 (sem e2e) |
| Cliente Axios único, `ApiError` discriminado, respostas críticas validadas com Zod | OK | `lib/api/client.ts`, `lib/api/errors.ts`; `cartSchema`, `orderSchema`, `quoteSchema` |
| Query keys por feature e invalidação após mutations | OK | `xxxKeys` em `features/*/api` e `entities/*/api.ts` |
| Formulários RHF + `zodResolver`, erros em português ligados ao campo | OK | `features/auth/components/auth-field.tsx`, `components/ui/form-field.tsx` |
| Sem dados fictícios nos componentes | OK | conteúdo da Home, páginas institucionais e rodapé vêm de `content.*` |
| Skeleton shimmer, vazio, erro, `aria-live` | OK | `components/feedback/*`; 25 usos de `aria-live` em `.tsx` |
| Playwright: compra, conta, carrinho, filtros, falhas, Socket.IO, a11y | Parcial | Socket.IO e perfil/carteiras sem testes (itens 6 e 7) |
| Código tipado, `package.json` + lockfile | OK | TS strict + `noUncheckedIndexedAccess`; `package-lock.json` |
| Assets e mocks | OK | `public/images/nfts` (+ `opt/`), `src/assets`, `src/mocks` |
| `README.md` e `ARCHITECTURE.md` com contratos REST e eventos | OK | `README.md`, `ARCHITECTURE.md`, `specs/001-nft-marketplace/contracts/*` |
| Testes e configs reproduzíveis | OK | `playwright.config.ts` (build de produção + preview), `lighthouse/run.mjs`, `.env.example` |
| Relatórios de testes e auditorias | Faltando | itens 2 e 5 |
| Deploy público configurado | Parcial | configuração feita, sem deploy (item 1) |
| Versionamento | Faltando | sem commits (item 12) |
