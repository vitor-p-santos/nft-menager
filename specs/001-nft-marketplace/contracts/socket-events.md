# Contrato de eventos (Socket.IO)

- **URL:** a mesma origem do app (`VITE_SOCKET_URL` sobrescreve), caminho padrão `/socket.io/`, transporte `websocket` (o binding não simula long-polling).
- **Mock:** `@mswjs/socket.io-binding` em `src/mocks/socket` (`ws.link` casa `^<origem>/?(socket\.io/?)?$`, porque o MSW tira `/socket.io/` e a query antes de comparar; ver ARCHITECTURE.md → "Tempo real").
- **Handshake:** `auth: { token }` (token da sessão REST). Sem token, ou com token inválido/vencido, a conexão é de visitante e recebe apenas eventos públicos (`nft.updated`); não há `connect_error`. Com token válido recebe também os `order.updated` do próprio usuário. O token é revalidado a cada entrega: se a sessão vencer, os eventos privados param.
- **Keep-alive:** o servidor envia ping a cada 20 s (`pingInterval` anunciado: 25 s).

## Envelope comum
```ts
{ eventId: string,      // único por emissão → deduplicação
  entityId: string,     // id do NFT ou do pedido
  version: number,      // = `version` da entidade depois da mudança (monotônica) → descarta eventos antigos
  emittedAt: string }   // ISO-8601
```
Schema: `eventEnvelopeSchema` (`src/lib/socket/events.ts`).

## `nft.updated` (público)
```ts
Envelope & { nftId: string,
  changes: { priceWei?: Wei, compareAtPriceWei?: Wei | null,
             editions?: { edition: Edition, available: number }[] } }  // lista completa, não diff
```
Schema: `nftUpdatedEventSchema` (`src/entities/nft/events.ts`). O NFT não tem status de listagem no modelo, por isso `changes.status` não existe.

**Quando é emitido:** conclusão de pagamento confirmado (`editions` de cada NFT cujo estoque baixou), cenário `conflict` do checkout (`priceWei` +5%) e `__mockRealtime.emitNftUpdate`.

**Efeito no cliente:** patch (`patchNftsIn`, só se a `version` em cache for menor) nas queries `['nfts', ...]` (detalhe, listas do catálogo, relacionados), favoritos (`['me', 'favorites']`) e destaque da home (`['content', 'home']`); as listas do catálogo ficam marcadas como velhas (sem refetch imediato); invalida `cart` se o NFT estiver no carrinho.

## `order.updated` (privado)
```ts
Envelope & { orderId: string, status: 'pending' | 'confirmed' | 'rejected',
             txHash: string | null,                                  // só em confirmed
             rejectionCode: 'payment_declined' | 'out_of_stock' | null,  // só em rejected
             rejectionReason: string | null,
             updatedAt: string }
```
Schema: `orderUpdatedEventSchema` (`src/entities/order/events.ts`).

**Quando é emitido:** transição `pending` → `confirmed`/`rejected` do pagamento simulado (só depois de gravar estoque, carrinho e recibo) e `__mockRealtime.emitOrderUpdate`.

**Efeito no cliente:** patch (`patchOrder`) em `orders.detail(id)`, `orders.byKey(*)`, linhas de `orders.list(*)` e na recuperação do checkout; invalida `orders.list` e `cart`; na confirmação invalida `orders.receipt(id)`. A tela de confirmação só aparece com `status = confirmed`.

## Ciclo de vida
| Situação | Comportamento |
|---|---|
| Login / troca de conta | reseta os `VersionGate`, desconecta e reconecta com o novo token. Não conta como reconexão: o `resetUserData` já refaz as queries privadas (uma vez) |
| Logout / expiração | idem, com `token = null` (visitante); `resetUserData` limpa as privadas |
| `disconnect` (queda) | status `reconnecting` (o indicador usa `useRealtimeStatus`, aria-live polite). Pedidos `pending` passam ao polling de 2 s (com o socket conectado: 15 s, só segurança) |
| `connect` após queda | refetch de NFTs, favoritos, home, carrinho, pedidos (menos recibos) e recuperação do checkout; a REST é a fonte da verdade |
| Evento duplicado (`eventId` visto) | ignorado |
| `version <= última aplicada` | ignorado (no `VersionGate` e de novo no patch, contra a `version` do cache) |
| Payload fora do schema | ignorado |

## Cenários de teste (gatilhos no mock)
`window.__mockRealtime` existe em dev, com `navigator.webdriver` (Playwright, inclusive contra o preview) ou com `localStorage['mock:realtime-tools'] = 'on'`:

| Função | Efeito |
|---|---|
| `stats()` | `{ connections, authenticated, down }` desta aba |
| `events()` | últimos 50 eventos emitidos (`{ name, payload, audience }`) |
| `emit(name, payload, { userId? })` | evento arbitrário, sem tocar no banco (com `userId`: só para esse usuário) |
| `emitNftUpdate(nftId, changes)` | grava a mudança no banco (`version` + 1) e emite `nft.updated` |
| `emitOrderUpdate(orderId, 'confirmed' \| 'rejected')` | conclui agora um pedido `pending` (inclusive `payment.outcome:hold`) e emite `order.updated` |
| `emitDuplicate()` | reenvia o último evento idêntico (mesmo `eventId`) |
| `emitStale(entityId?, overrides?)` | reenvia o último evento da entidade com `eventId` novo e `version - 1` (ex.: `overrides = { changes: { priceWei: '1' } }`) |
| `dropConnection({ downMs? })` | derruba as conexões; com `downMs`, recusa novas conexões nesse intervalo |
