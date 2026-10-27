# Plano técnico — Spec 001

## Contexto técnico
| Item | Escolha |
|---|---|
| Linguagem / build | TypeScript 6 (strict) · Vite 8 · React 19 |
| Rotas | TanStack Router (file-based, `src/routes`, search params validados com Zod) |
| Dados | TanStack Query 5 + Axios (`src/lib/api`) com respostas validadas por Zod |
| Mocks | MSW 2.15 (REST) + `@mswjs/socket.io-binding` (Socket.IO), banco em `localStorage` |
| UI | Tailwind 4 + shadcn/ui (new-york), Roboto Mono self-hosted, ícones lucide + SVGs do Figma |
| Forms | React Hook Form + Zod (`@hookform/resolvers` 5.2) |
| Testes | Playwright (e2e, visual, a11y com axe) nos viewports 390 / 768 / 1440 |
| Auditoria | Lighthouse CLI, 3 execuções × mobile/desktop, medianas em `reports/lighthouse/SUMMARY.md` |
| Deploy | Vercel (estático + MSW em produção) |

## Constituição — checagem
- I (Figma): tokens aplicados, recortes em `design/figma`, `get_design_context` por seção ao implementar.
- II (comportamento real): as lacunas estão em `research.md` com proposta, e nenhum botão fica sem ação.
- III (API única): tudo em `features/*/api` mais handlers. Componentes sem dados fixos.
- IV (wei): `src/lib/money/eth.ts`.
- V a VII: Zod nos contratos, testes de a11y e cenários determinísticos.

## Arquitetura (resumo; detalhes em `ARCHITECTURE.md`)
```
routes/  →  features/<x>/components  →  features/<x>/api (hooks Query)  →  lib/api (Axios+Zod)
                                                                        ↘  mocks/handlers (MSW)
SocketProvider (app/) → lib/socket (client, VersionGate) → setQueryData / invalidate
```
- Cada feature expõe `api/keys.ts` (query keys), `api/queries.ts` (`queryOptions`), `api/mutations.ts`, `schemas/*.ts` e `components/`.
- Os loaders das rotas chamam `queryClient.ensureQueryData(options)` para fazer prefetch sem duplicar a lógica.
- Auth: `features/auth/session-store.ts` (token + expiração, `useSyncExternalStore`). `configureSession` liga o store ao Axios.
- Dados compartilhados entre features (Nft, Wei, Totals) ficam em `src/entities/*` para evitar dependências cruzadas entre features.

## Fases
| Fase | Escopo | Verificação ao final |
|---|---|---|
| 0 | Ambiente, arquitetura, tokens, spec | typecheck, lint, build, smoke e2e/a11y |
| 1 | Layout base (header, footer, tab bar mobile) + Home + catálogo | e2e filtros/URL, visual "início", axe |
| 2 | Detalhe do NFT + favoritos | e2e detalhe/quantidade, visual "detalhe" |
| 3 | Carrinho + cupons + carrinho anônimo/merge | e2e carrinho/cupom/persistência, visual "carrinho" |
| 4 | Autenticação + sessão + troca de conta | e2e conta, expiração, retorno ao fluxo |
| 5 | Checkout + idempotência + revalidação | e2e compra, falhas, timeout, visual "pagamento" |
| 6 | Pedidos + recibos | e2e pendente/confirmado/recusado |
| 7 | Perfil + carteiras | e2e perfil/avatar/senha/carteiras |
| 8 | Tempo real | e2e socket (dedupe, versão, reconexão) |
| 9 | Performance, Lighthouse, relatórios e deploy | Lighthouse com medianas, deploy público |

Lista executável com status: [`/TASKS.md`](../../TASKS.md).
