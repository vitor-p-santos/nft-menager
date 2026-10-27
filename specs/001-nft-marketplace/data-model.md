# Modelo de dados

Todos os schemas são Zod em `src/features/<feature>/schemas` e são compartilhados com os handlers MSW. `Wei` = string decimal sem sinal (`/^\d+$/`). Datas em ISO-8601.

```ts
type Network = 'ethereum' | 'polygon' | 'solana'
type WalletProvider = 'metamask' | 'walletconnect' | 'coinbase'
type Edition = '1/1' | '1/10' | '1/50' | 'open'

User        { id, username, displayName, email, ensName: string | null, avatarUrl: string | null, createdAt }
Session     { token, userId, expiresAt }               // token opaco, 15 min por padrão
Profile     User & { walletNickname: string | null }   // apelido da carteira principal (Fase 7)

Category    { id, label, count }                       // facets de "Coleções"
Nft         { id, slug, name, tokenId, collection, categoryId, network,
              priceWei: Wei, compareAtPriceWei?: Wei, rarity?: 'rare',
              editions: { edition: Edition, available: number }[],
              images: { src, alt, width, height }[],
              rating: number, reviewsCount: number,
              description, details: { network, contract, royalties },
              attributes: string[], creator, contractAddress, royaltyBps,
              listedAt, trendingScore, version: number }
Review      { id, nftId, author, rating, body, createdAt }

Favorite    { userId, nftId, createdAt }

Cart        { id, ownerId | anonymousId, items: CartItem[], coupon: AppliedCoupon | null,
              totals: Totals, itemCount, version: number }
CartItem    { id, nftId, edition, quantity, unitPriceWei: Wei,   // preço na adição
              currentPriceWei: Wei, lineTotalWei: Wei, available,  // estado atual (T-050)
              issue: 'price_changed' | 'unavailable' | 'quantity_reduced' | null,
              nft: { id, slug, name, tokenId, collection, network, image } }
AppliedCoupon { code, kind, bps?, amountWei?, minSubtotalWei?, eligible: boolean }
Coupon      { code, kind: 'percent' | 'fixed', bps?, amountWei?, minSubtotalWei?, expiresAt? }
Totals      { subtotalWei, discountWei, networkFeeWei, totalWei }

Quote       { id, cartVersion, items: CartItem[], totals: Totals, coupon: AppliedCoupon | null,
              changes: QuoteChange[], expiresAt }      // revalidação pré-compra (10 min)
QuoteChange price_changed | quantity_reduced | unavailable | coupon_removed |
            coupon_ineligible | cart_updated | totals_changed   // ver contracts/rest-api.md

Wallet      { id, userId, role: 'primary' | 'secondary', label, nickname, displayName, profileName,
              provider: WalletProvider, network: Network, address, ensName | null,
              secondaryWallet | null, referralCode | null, email | null,
              createdAt }                               // userId e createdAt não saem na API
                                                        // exatamente uma 'primary' por usuário com carteiras
Collector   { displayName, username, network, profileName, walletAddress, secondaryWallet?,
              walletProvider, referralCode?, email, ensName?, note? }   // D-08

Order       { id, userId, idempotencyKey, quoteId, status: 'pending' | 'confirmed' | 'rejected',
              items: OrderItem[], coupon: { code, discountWei } | null, totals: Totals,
              wallet: WalletSnapshot, network, collector: Collector,
              txHash | null, rejectionCode: 'payment_declined' | 'out_of_stock' | null,
              rejectionReason | null, createdAt, updatedAt, version }
OrderItem   { id, nftId, edition, quantity, unitPriceWei, lineTotalWei, nft: {…} }
WalletSnapshot { walletId | null, label | null, provider, network, address, ensName | null }
Receipt     { orderId, issuedAt, snapshot: Order (congelado, readonly) }
```

## Regras (implementadas nos handlers)
- O total é `subtotal − desconto + taxa` (wei), sempre recalculado no servidor.
- A disponibilidade por edição diminui somente na **confirmação** do pedido. Um pedido recusado não consome estoque.
- A `Idempotency-Key` é única por usuário. A mesma chave com o mesmo payload devolve o pedido existente (200), e com outro payload devolve 422 `idempotency_key_reused`. A chave só é vinculada quando o pedido é criado (um 4xx não a consome).
- A cotação ajusta o carrinho (preço aceito, quantidade, itens esgotados, cupom expirado) e guarda um snapshot; `POST /orders` devolve 409 se o carrinho, o preço ou o estoque mudarem depois dela. Uma cotação gera no máximo um pedido.
- Um pedido confirmado remove do carrinho os itens comprados; um recusado não mexe no carrinho nem no estoque.
- Carteiras: a 1ª nasce principal; remover a principal promove a secundária mais antiga; endereço único por usuário + rede.
- Trocar a senha revoga as outras sessões do usuário. O avatar é uma data URL (PNG/JPEG/WebP ≤ 2 MB) em `User.avatarUrl`.
- A `version` de `Nft` e `Order` é incrementada em toda mudança e acompanha os eventos do socket.
- O `Receipt` é gravado uma vez na confirmação e nunca é reescrito.

## Fixtures
- **Usuários:**
  - `ana@kurio.dev` / `Senha@123` (`user-ana`, `ana.eth`): tem carteiras e pedidos; vinculada ao Google no OAuth simulado;
  - `bruno@kurio.dev` / `Senha@123` (`user-bruno`): conta nova, sem carteiras; vinculada ao Facebook.
- **Pedidos** (`src/mocks/fixtures/orders.ts`): só a Ana tem histórico (12 pedidos, maio a outubro de 2026, ids `ord_fixture-ana-0001…0012`): 10 `confirmed` com recibo (alguns com preço pago diferente do preço atual do catálogo, um com `KURIO10` e um com `LANCAMENTO`), 1 `rejected` (`payment_declined`, sem recibo) e 1 `pending` com `outcome: 'hold'` (nunca conclui, sem recibo). Cada pedido usa a carteira salva da mesma rede dos itens. O Bruno não tem pedidos.
- **Carteiras** (`src/mocks/fixtures/wallets.ts`): Ana tem "Principal" (`wallet-ana-principal`, MetaMask, Ethereum, `0xA91F…E82C`, ana.eth) e "Reserva" (`wallet-ana-reserva`, Coinbase, Polygon, nova.kurio.eth), como no checkout mobile.
  - Fixtures em `src/mocks/fixtures/users.ts`; contas criadas no cadastro ficam em `mockdb:users`.
- **NFTs do Figma:** Emerald Ape #042 (1.19), Sage Nomad #009 (1.69), Neon Vessel #552 (1.99, antes 2.29, RARO), Cosmic Bloom #118 (1.29), Violet Nomad #314 (1.39), Ivory Baron #088 (1.79), Golden Beat #207 (0.99), Golden Frequency #071 (0.59) e Golden Signal #160 (0.39). Itens adicionais são gerados de forma determinística (seed fixa) para preencher a paginação e os facets.
- **Cupons:** `KURIO10` (10%), `LANCAMENTO` (0,05 ETH fixo, subtotal mínimo 1 ETH) e `EXPIRADO` (expirado). Fixtures em `src/mocks/fixtures/coupons.ts`, junto com a taxa de rede por rede.
