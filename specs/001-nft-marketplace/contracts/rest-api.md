# Contrato REST (API simulada via MSW)

- **Base:** `/api` (`VITE_API_URL`). JSON. Autenticação via `Authorization: Bearer <token>`.
- **Carrinho anônimo:** `X-Cart-Id: <uuid>`.
- **Envelope de erro:** `{ "code": string, "message": string, "details"?: object }`.

| Status | `code` comuns |
|---|---|
| 400/422 | `validation_error` (details = erros por campo), `idempotency_key_reused`, `coupon_invalid`, `coupon_expired`, `cart_empty` |
| 401 | `unauthorized`, `session_expired`, `invalid_credentials` |
| 404 | `not_found` |
| 409 | `email_taken`, `username_taken`, `price_changed`, `out_of_stock`, `quote_expired`, `cart_version_mismatch` |
| 503 | `service_unavailable` |

**Cenários** (`withScenario(key)`): `success`, `failure` (500), `latency` (+2,5 s), `timeout` (> 10 s), `conflict` (409) e `unavailable` (503). A chave de cada endpoint está na coluna *Cenário*.

## Auth
| Método | Rota | Corpo → Resposta | Cenário |
|---|---|---|---|
| POST | `/auth/register` | `{username,email,password}` → 201 `{user,session}` \| 409 `email_taken`/`username_taken` (`details.field`) \| 422 | `auth.register` |
| POST | `/auth/login` | `{email,password}` → 200 `{user,session}` \| 401 `invalid_credentials` \| 422 | `auth.login` |
| POST | `/auth/oauth/:provider` | — → 200 `{user,session}` \| 404 `not_found` (provedor ≠ `google`/`facebook`) *(D-05)* | `auth.oauth` |
| POST | `/auth/logout` | — → 204 (revoga o token enviado; idempotente) | `auth.logout` |
| GET | `/auth/me` | → 200 `{user,session}` \| 401 | `auth.me` |
| POST | `/auth/password-reset` | `{email}` → 202 sem corpo, exista ou não o e-mail \| 422 *(D-07)* | `auth.reset` |

Regras de auth:
- `User = {id, username, displayName, email, ensName: string|null, avatarUrl: string|null, createdAt}`, `Session = {token, userId, expiresAt}`. Schemas em `src/entities/session/schema.ts`; corpos validados com `src/features/auth/schemas/auth.ts` (os mesmos do client).
- E-mail é normalizado (trim + minúsculas). E-mail e usuário são únicos sem diferenciar maiúsculas. Senha nova: ≥ 8 caracteres, com letra e número. O 422 traz `details` = `{campo: primeira mensagem}`.
- Token opaco com validade de 15 min (configurável em segundos por `?sessionTtl=` ou `localStorage['mock:session-ttl']`), persistido em `mockdb:sessions`.
- **401 em qualquer rota autenticada:** sem `Authorization` → `unauthorized`; token vencido, revogado (logout) ou desconhecido → `session_expired`. Nas rotas do carrinho, token inválido também dá `session_expired` (não cai no carrinho anônimo).
- Cenário `auth.session` = `expired` (ex.: `?mock=auth.session:expired`): toda requisição com token responde 401 `session_expired`. Não afeta login, cadastro e OAuth.
- OAuth simulado: `google` → Ana, `facebook` → Bruno (fixtures em `src/mocks/fixtures/users.ts`).

## Catálogo e conteúdo
| Método | Rota | Resposta | Cenário |
|---|---|---|---|
| GET | `/nfts?q&category[]&network[]&minPrice&maxPrice&tab=all\|new\|trending&sort=recent\|price_asc\|price_desc\|popular&page&pageSize` | `{items:Nft[],page,pageSize,total,facets:{categories,networks,priceRange:{minWei,maxWei}}}` | `catalog.list` |
| GET | `/nfts/:id` | `Nft` | `catalog.detail` |
| GET | `/nfts/:id/related` | `Nft[]` | `catalog.related` |
| GET | `/nfts/:id/reviews?page&pageSize` | `{items:Review[],page,pageSize,total}`, `Review = {id,nftId,author,rating:1–5 inteiro,body,createdAt:ISO datetime}`, da mais recente para a mais antiga; `pageSize` padrão 5 (máx. 50); `total` = `reviewsCount` do NFT e a média ≈ `rating`; NFT inexistente → 404 `not_found` | `catalog.reviews` |
| GET | `/content/home` | `{hero[],featured:Nft,promos[],posts[]}` | `content.home` |
| GET | `/content/site` | `{contact:{email,phone,phoneHref},socials:[{id:facebook\|instagram\|twitter\|linkedin\|youtube,label,url}]}` (D-10) | `content.site` |
| GET | `/content/pages/:slug` | `{slug,title,summary,updatedAt:ISO date,sections:[{heading,paragraphs[]}]}`; slugs `central-de-ajuda`, `como-comprar`, `carteira-e-seguranca`, `politica-do-mercado`, `denunciar-item`, `estudio-do-criador`; outro slug → 404 `not_found` (D-10) | `content.page` |
| POST | `/newsletter` | `{email}` → 202 | `content.newsletter` |

## Favoritos (autenticado)
| Método | Rota | Resposta | Cenário |
|---|---|---|---|
| GET | `/me/favorites` | `NftSummary[]` (mais recente primeiro) | `favorites.list` |
| PUT | `/me/favorites/:nftId` | 204 (idempotente) \| 404 `not_found` | `favorites.add` |
| DELETE | `/me/favorites/:nftId` | 204 (idempotente) | `favorites.remove` |

Sem sessão válida → 401 `{code:'unauthorized',message:'Entre para continuar'}`. Persistidos por usuário em `mockdb:favorites`; o usuário vem do token (`authenticate(request)` em `src/mocks/db/session.ts`). Token vencido → 401 `session_expired`.

**Disponibilidade por edição** (`Nft.editions[].available`, fixtures determinísticas): `nft-sage-nomad-009` tem a edição `1/1` esgotada (`available: 0`); `nft-emerald-ape-042` tem `1/1` com `available: 1`; `nft-copper-ape-291` tem `1/10` com `available: 1`.

## Carrinho (anônimo via `X-Cart-Id` ou autenticado)
| Método | Rota | Corpo → Resposta | Cenário |
|---|---|---|---|
| GET | `/cart` | → `Cart` | `cart.get` |
| POST | `/cart/items` | `{nftId,edition,quantity}` → `Cart` (mesmo NFT+edição soma a quantidade) \| 404 \| 409 `out_of_stock` `details.available` | `cart.add` |
| PATCH | `/cart/items/:itemId` | `{quantity}` → `Cart` \| 409 `out_of_stock` (aceita o preço atual do item) | `cart.update` |
| DELETE | `/cart/items/:itemId` | → `Cart` | `cart.remove` |
| POST | `/cart/coupon` | `{code}` → `Cart` \| 422 `coupon_invalid`/`coupon_expired` | `cart.coupon` |
| DELETE | `/cart/coupon` | → `Cart` | `cart.coupon` |
| POST | `/cart/merge` | `{anonymousCartId}` → `Cart` \| 401 sem sessão (quantidades limitadas ao estoque; cupom do usuário prevalece) | `cart.merge` |

Regras do carrinho:
- Sem sessão, `X-Cart-Id` (uuid) é obrigatório (400 `validation_error` se ausente/inválido). Com sessão o servidor ignora o header e usa o carrinho do usuário.
- Toda mutation devolve o `Cart` completo e incrementa `version`. Um carrinho que nunca foi alterado tem `version: 0`.
- `Cart = {id, items: CartItem[], coupon: AppliedCoupon|null, totals: Totals, itemCount, version}`.
- `CartItem = {id, nftId, edition, quantity, unitPriceWei, currentPriceWei, lineTotalWei, available, issue: 'price_changed'|'unavailable'|'quantity_reduced'|null, nft: {id,slug,name,tokenId,collection,network,image}}`. O subtotal usa o **preço atual**; itens indisponíveis entram com quantidade 0.
- `AppliedCoupon = {code, kind, bps, amountWei, minSubtotalWei, eligible}`. Cupom com subtotal mínimo que deixa de ser atingido fica aplicado com `eligible: false` e desconto 0.
- Taxa de rede: uma por rede presente no carrinho (ethereum 0,0025; polygon 0,0004; solana 0,0001 ETH).
- Cupons: `KURIO10` (10%), `LANCAMENTO` (0,05 ETH fixo, subtotal ≥ 1 ETH; abaixo → 422 `coupon_invalid` com `details.minSubtotalWei`), `EXPIRADO` (422 `coupon_expired`). Código inexistente → 422 `coupon_invalid`. O código não diferencia maiúsculas.

## Checkout e pedidos (autenticado)
| Método | Rota | Corpo → Resposta | Cenário |
|---|---|---|---|
| POST | `/checkout/quote` | `{cartVersion}` → 200 `Quote` (com `changes[]`) \| 422 `cart_empty` \| 422 | `checkout.quote` |
| POST | `/orders` | Header `Idempotency-Key`. `{quoteId,walletId,network,collector}` → 201 `Order(pending)` \| 200 (replay) \| 400 (sem chave) \| 409 `price_changed`/`out_of_stock`/`cart_version_mismatch`/`quote_expired` (`details.changes`) \| 422 `validation_error`/`idempotency_key_reused` | `checkout.create` |
| GET | `/orders?status&page` | `{items:Order[],total,page,pageSize,totalPages,counts:{all,pending,confirmed,rejected}}` (10 por página, mais recente primeiro; `total`/`totalPages` do filtro, `counts` sem filtro) | `orders.list` |
| GET | `/orders/:id` | `Order` \| 404 (inexistente ou de outro usuário) | `orders.detail` |
| GET | `/orders/by-key/:idempotencyKey` | `Order` \| 404 (a chave nunca chegou ao servidor) — recuperação após timeout/refresh | `orders.recover` |
| GET | `/orders/:id/receipt` | `Receipt` \| 404 (pedido não confirmado, inexistente ou de outro usuário) | `orders.receipt` |
| POST/PUT/PATCH/DELETE | `/orders/:id`, `/orders/:id/receipt` | → 405 `method_not_allowed` (`details.allow: 'GET'`): pedido e recibo são somente leitura | — |

Schemas: `Quote`/`QuoteChange`/`CreateOrderInput`/`collectorSchema` em `src/features/checkout/schemas/checkout.ts` (os mesmos do client e do handler); `Order`/`Receipt` em `src/entities/order/schema.ts`; `Wallet` em `src/entities/wallet/schema.ts`.

**Cotação (`POST /checkout/quote`):** revalida o carrinho do usuário contra o catálogo e **grava os ajustes** no carrinho (o `version` sobe se algo mudou): preço aceito = preço atual, quantidade limitada ao estoque, item esgotado removido, cupom expirado removido. "Antes" = preços aceitos (`unitPriceWei`) e quantidades pedidas; "depois" = carrinho ajustado. A cotação vale 10 min e guarda o snapshot no servidor.
- `Quote = {id, cartVersion, items: CartItem[] (só quantidade > 0, issue null), coupon: AppliedCoupon|null, totals, changes: QuoteChange[], expiresAt}`.
- `QuoteChange` (discriminado por `type`): `price_changed {itemId,nftId,name,edition,fromWei,toWei}` · `quantity_reduced {…,fromQuantity,toQuantity}` · `unavailable {…,fromQuantity}` (saiu do carrinho) · `coupon_removed {code,reason:'expired'}` · `coupon_ineligible {code,minSubtotalWei}` · `cart_updated {fromVersion,toVersion}` (o `cartVersion` enviado difere do atual) · `totals_changed {from:Totals,to:Totals}`.
- Se `changes` não estiver vazio, a UI mostra o diff e pede nova confirmação. Uma nova cotação deve enviar `quote.cartVersion`; ela volta com `changes: []`.

**Pedido (`POST /orders`):**
- `CreateOrderInput = {quoteId, walletId: string|null, network, collector}`. `walletId` = carteira salva (`GET /me/wallets`): a `network` e o `collector.walletAddress` precisam bater com ela (senão 422 em `network`/`collector.walletAddress`); `null` = carteira digitada no formulário. `network` = `collector.network` (a rede da carteira define a rede do pedido).
- `collector = {displayName, username, network, profileName, walletAddress, secondaryWallet?, walletProvider, referralCode?, email, ensName?, note?}` (D-08). Endereço: `0x` + 40 hex (Ethereum/Polygon) ou base58 (Solana). `ensName` sem sufixo ganha `.eth`. Opcionais vazios viram `null`. 422 → `details` = `{'collector.email': msg, …}`.
- `Idempotency-Key` obrigatório (`[A-Za-z0-9_-]{8,128}`, o client usa UUID), único por usuário. Mesma chave + mesmo corpo → **200** com o pedido existente (estado atual). Mesma chave + outro corpo → **422 `idempotency_key_reused`**. A chave só fica vinculada quando o pedido é criado: respostas 4xx não consomem a chave.
- Ordem das verificações: 401 → 400 (chave) → 422 (corpo) → replay/reuso da chave → cotação inválida (422 `quoteId`) / já usada ou vencida (409 `quote_expired`) → carteira (422) → `cart_version_mismatch` → `price_changed` → `out_of_stock` (409 com `details.changes`, mesmo formato da cotação).
- Envios simultâneos com a mesma chave não criam dois pedidos (a verificação e a gravação são atômicas no handler). Uma cotação gera no máximo um pedido.
- `Order = {id, idempotencyKey, quoteId, status, items: OrderItem[], coupon: {code,discountWei}|null, totals, wallet: WalletSnapshot, network, collector, txHash: string|null, rejectionCode: 'payment_declined'|'out_of_stock'|null, rejectionReason: string|null, createdAt, updatedAt, version}`. `OrderItem = {id, nftId, edition, quantity, unitPriceWei, lineTotalWei, nft:{id,slug,name,tokenId,collection,network,image}}`. `WalletSnapshot = {walletId|null, label|null, provider, network, address, ensName|null}`.
- `Receipt = {orderId, issuedAt, snapshot: Order}`: gravado uma vez na confirmação e nunca reescrito. O `snapshot` é a cópia do pedido no momento da confirmação (preço pago, carteira, totais, `txHash`) e não é recalculado a partir do catálogo: mudar preço ou estoque do NFT depois não altera o recibo. Não existe rota de escrita para recibos (405).
- `GET /orders?status` aceita `pending|confirmed|rejected`; valor inválido é ignorado (sem filtro). `page` além da última devolve `items: []`.

**Pagamento simulado:** o pedido nasce `pending` (`version: 1`) e, depois de 1,5–4 s, vai para `confirmed` ou `rejected` (`version: 2`). Se o timer se perder (refresh), a próxima leitura (`GET /orders*` ou o replay) conclui o pedido.
- `confirmed`: revalida e baixa o estoque (`editions[].available`, `Nft.version + 1`), gera `txHash`, grava o recibo e remove do carrinho os itens comprados (e o cupom usado). Se o estoque não der mais, vira `rejected` com `rejectionCode: 'out_of_stock'`.
- `rejected`: carrinho e estoque intactos.
- A conclusão emite `order.updated` (só para o dono) e `nft.updated` para cada NFT cujo estoque baixou (ver [socket-events.md](./socket-events.md)). O polling continua como fallback enquanto `pending`: 2 s com o socket fora e 15 s com ele conectado.

**Cenários do checkout** (além dos seis comuns em `checkout.quote`, `checkout.create`, `orders.*`, `wallets.list`):
| Chave | Valores | Efeito |
|---|---|---|
| `checkout.quote` | `conflict` | Antes de revalidar, o preço do 1º item sobe 5% (uma vez por carrinho): a cotação volta com `price_changed` + `totals_changed`. |
| `checkout.create` | `conflict` | O preço do 1º item sobe 5% durante a compra (uma vez por carrinho) → 409 `price_changed`; a nova cotação mostra o diff e a nova confirmação passa. |
| `checkout.create` | `timeout` | O pedido **é criado**, mas a resposta só chega depois do timeout do client (10 s) → recuperação por `GET /orders/by-key/:key`. |
| `checkout.create` | `failure` / `unavailable` | 500 / 503 sem criar pedido (resultado desconhecido para o client, que mantém a chave). |
| `payment.outcome` | `confirm` (padrão) \| `reject` \| `hold` | Resultado do pagamento; `hold` deixa o pedido `pending` para sempre (testes de recuperação/pendente). |
| `payment.delay` | ms (ex.: `300`) | Duração do pagamento simulado (padrão 1,5–4 s). |

Ex.: `?mock=checkout.create:timeout,payment.outcome:reject` ou `localStorage['mock:scenarios'] = '{"payment.delay":"300"}'`.

## Perfil e carteiras (autenticado, Fase 7)
| Método | Rota | Corpo → Resposta | Cenário |
|---|---|---|---|
| GET | `/me/profile` | → 200 `Profile` | `profile.get` |
| PATCH | `/me/profile` | `Partial<{displayName,username,email,ensName,walletNickname}>` → 200 `Profile` \| 400 (corpo não é objeto) \| 422 `validation_error` \| 409 `email_taken`/`username_taken` (`details.field`) | `profile.update` |
| PUT | `/me/avatar` | `{dataUrl}` (PNG/JPEG/WebP, ≤ 2 MB decodificados) → 200 `Profile` \| 422 `validation_error` (`details.dataUrl`) \| 413 `payload_too_large` (armazenamento local cheio) | `profile.avatar` |
| DELETE | `/me/avatar` | → 200 `Profile` (idempotente) | `profile.avatar` |
| POST | `/me/password` | `{currentPassword,newPassword}` → 204 \| 422 `validation_error` (`details.newPassword`…) \| 422 `wrong_password` (`details.currentPassword`) | `profile.password` |
| GET | `/me/wallets` | → 200 `Wallet[]` (principal primeiro, depois da mais antiga para a mais nova) | `wallets.list` |
| POST | `/me/wallets` | `WalletInput & {makePrimary?: boolean}` → 201 `Wallet` \| 422 `validation_error` \| 422 `wallet_limit_reached` \| 409 `wallet_exists` (`details.field = 'address'`) | `wallets.create` |
| PATCH | `/me/wallets/:id` | `Partial<WalletInput>` → 200 `Wallet` \| 404 \| 422 \| 409 `wallet_exists` | `wallets.update` |
| DELETE | `/me/wallets/:id` | → 204 \| 404 | `wallets.remove` |
| POST | `/me/wallets/:id/primary` | → 200 `Wallet[]` (lista atualizada) \| 404 | `wallets.primary` |

Todas exigem sessão (401 `unauthorized`/`session_expired`, como nas demais rotas). O usuário vem sempre do token: carteira de outro usuário responde 404, como se não existisse. Os seis cenários comuns valem em todas as chaves (ex.: `?mock=profile.update:unavailable,wallets.create:failure`).

**Tipos.** Schemas em `src/features/profile/schemas` (os mesmos do formulário, do handler e da resposta) e `Wallet` em `src/entities/wallet/schema.ts`.
- `Profile = User & {walletNickname: string|null}`: `walletNickname` é o apelido da carteira **principal** ("Apelido da carteira" do Figma `d-08`), `null` sem carteiras.
- `Wallet = {id, role:'primary'|'secondary', label, nickname, displayName, profileName, provider:'metamask'|'walletconnect'|'coinbase', network, address, ensName|null, secondaryWallet|null, referralCode|null, email|null}`.
- `WalletInput = {label?, nickname, displayName, profileName, network, provider, address, secondaryWallet?, referralCode?, email, ensName?}` (campos do Figma `d-09`; `label` não está no Figma: é o nome do cartão no checkout e, vazio, vira o apelido).

**Perfil.**
- PATCH parcial: o servidor junta o corpo aos dados atuais e valida o resultado inteiro com `profileFormSchema` (422 com `details` = `{campo: primeira mensagem}`). Campos desconhecidos (ex.: `avatarUrl`, `id`) são ignorados.
- `displayName` 2–50; `username` 3–20 (`[a-zA-Z0-9_.]`); `email` normalizado (trim + minúsculas); usuário e e-mail únicos sem diferenciar maiúsculas. `ensName` opcional: vazio → `null`, sem sufixo ganha `.eth`.
- `walletNickname` (2–40) é obrigatório quando há carteira principal e renomeia essa carteira; sem carteiras precisa ficar vazio (422 em `walletNickname`).
- Avatar: data URL `data:<mime>;base64,…`. O tipo declarado precisa ser `image/png`, `image/jpeg` ou `image/webp`, o conteúdo decodificado ≤ 2 MB e a assinatura do arquivo (magic bytes) igual ao tipo declarado. Guardado como data URL em `User.avatarUrl` (substitui o anterior). O client reduz a imagem para 256 px antes de enviar (`prepareAvatar`).
- Senha: `currentPassword` obrigatória; `newPassword` com as regras do cadastro (≥ 8, letra e número, ≤ 128) e diferente da atual. Ordem: 422 `validation_error` → 422 `wrong_password`. Sucesso revoga as **outras** sessões do usuário; o token atual continua válido.

**Carteiras.**
- Exatamente uma principal enquanto houver carteiras. A 1ª carteira nasce principal; `makePrimary: true` torna a nova a principal e rebaixa a anterior. O papel só muda por `POST /:id/primary` (idempotente); `role` no PATCH é ignorado.
- Endereço validado para a rede: `0x` + 40 hex (Ethereum/Polygon) ou base58 (Solana). `secondaryWallet` = nome ENS ou endereço válido. Trocar a rede no PATCH revalida o endereço.
- Mesmo endereço na mesma rede do mesmo usuário → 409 `wallet_exists` (EVM sem diferenciar maiúsculas). Até 10 carteiras por usuário (422 `wallet_limit_reached`).
- **Remover a principal promove a secundária mais antiga.** Remover a única carteira é permitido (o checkout aceita a carteira digitada). Carteiras usadas em pedidos podem ser removidas, inclusive com pedido `pending`: o pedido guarda um `WalletSnapshot` e não depende da carteira salva.
- O checkout continua usando `GET /me/wallets` e `walletId` da carteira salva; a carteira removida deixa de ser aceita em `POST /orders` (422 em `walletId`).
