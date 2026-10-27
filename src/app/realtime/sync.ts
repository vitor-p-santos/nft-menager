import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { cartKeys, invalidateCartIfHasNft } from '@/entities/cart'
import { nftUpdatedEventSchema, patchNftsIn, type NftUpdatedEvent } from '@/entities/nft'
import { applyOrderUpdated, hasPendingOrder, orderKeys, orderUpdatedEventSchema, patchOrder } from '@/entities/order'
import { catalogKeys } from '@/features/catalog/api/queries'
import { checkoutKeys } from '@/features/checkout/api/keys'
import type { CheckoutRecovery } from '@/features/checkout/api/queries'
import { homeKeys } from '@/features/home/api/queries'
import { favoritesKeys, nftKeys } from '@/features/nft/api/queries'
import {
  getSocketSessionToken,
  openRealtimeConnection,
  realtimeStatusStore,
  registerSocketSessionHandler,
  SOCKET_EVENTS,
  VersionGate,
  type RealtimeConnection,
  type SocketEventName,
} from '@/lib/socket'

/**
 * Integração Socket.IO → cache do TanStack Query (T-092/T-093). Compõe várias features, por isso fica
 * em `app/`. O SocketProvider (T-091) só precisa chamar `useRealtimeSync(queryClient)` (ou
 * `startRealtimeSync`) uma vez e ler `useRealtimeStatus()` para o indicador.
 *
 * Pipeline de cada evento: Zod (payload fora do contrato é descartado) → `VersionGate` (duplicado ou
 * antigo é descartado) → patch no cache (que ainda compara com a `version` do dado em cache, para não
 * sobrescrever uma resposta REST mais nova) → invalidações.
 */

/** Queries que guardam NFTs com `priceWei`/`version` (detalhe, listas, relacionados, favoritos, destaque). */
const NFT_ROOTS: readonly QueryKey[] = [nftKeys.all, favoritesKeys.all, homeKeys.content]
const RECOVERY_PREFIX = [...checkoutKeys.all, 'recovery'] as const

export function applyNftUpdatedToCache(queryClient: QueryClient, event: NftUpdatedEvent) {
  for (const queryKey of NFT_ROOTS) {
    queryClient.setQueriesData({ queryKey }, (data: unknown) => (data === undefined ? data : patchNftsIn(data, event)))
  }
  // A linha já mostra o preço novo; filtros/ordenação por preço só se corrigem com o servidor. Marca as
  // listas como velhas sem refazer agora (evita a lista "pular" na frente do usuário).
  void queryClient.invalidateQueries({ queryKey: catalogKeys.lists(), refetchType: 'none' })
  invalidateCartIfHasNft(queryClient, event.nftId)
}

export function applyOrderUpdatedToCache(queryClient: QueryClient, event: Parameters<typeof applyOrderUpdated>[1]) {
  applyOrderUpdated(queryClient, event)
  queryClient.setQueriesData<CheckoutRecovery | null>({ queryKey: RECOVERY_PREFIX }, (data) =>
    data ? { ...data, order: patchOrder(data.order, event) } : data,
  )
  // Confirmado: os itens comprados saem do carrinho no servidor. Recusado: o carrinho fica igual.
  void queryClient.invalidateQueries({ queryKey: cartKeys.all })
}

/** Depois de uma queda os eventos do intervalo se perderam: a REST é a fonte da verdade. */
function refetchAfterReconnect(queryClient: QueryClient) {
  for (const queryKey of NFT_ROOTS) void queryClient.invalidateQueries({ queryKey })
  void queryClient.invalidateQueries({ queryKey: cartKeys.all })
  void queryClient.invalidateQueries({ queryKey: RECOVERY_PREFIX })
  // Recibos são imutáveis (`staleTime: Infinity`): ficam de fora.
  void queryClient.invalidateQueries({
    queryKey: orderKeys.all,
    predicate: (query) => query.queryKey[1] !== 'receipt',
  })
}

/**
 * Pedidos `pending` na tela passam ao polling rápido (2 s) quando o socket cai: o TanStack Query só
 * reavalia `refetchInterval` quando a query atualiza, então refazemos essas queries.
 */
function refetchPendingOrders(queryClient: QueryClient) {
  void queryClient.refetchQueries({
    type: 'active',
    predicate: ({ queryKey, state }) => {
      if (queryKey[0] === orderKeys.all[0]) return hasPendingOrder(state.data)
      if (queryKey[0] === RECOVERY_PREFIX[0] && queryKey[1] === RECOVERY_PREFIX[1]) {
        return hasPendingOrder((state.data as CheckoutRecovery | null | undefined)?.order)
      }
      return false
    },
  })
}

export type RealtimeSyncOptions = {
  /** Chamado para cada evento descartado (inválido, duplicado ou antigo). Útil em dev/testes. */
  onDiscard?: (info: { name: SocketEventName; reason: 'invalid' | 'duplicate_or_stale'; payload: unknown }) => void
}

/**
 * Abre a conexão com o token da sessão atual, aplica os eventos ao cache e acompanha a sessão
 * (login/logout/expiração/troca de conta → reseta os gates e reconecta com o novo token).
 * Devolve a função que encerra tudo (use no cleanup do `useEffect`).
 */
export function startRealtimeSync(queryClient: QueryClient, options: RealtimeSyncOptions = {}): () => void {
  const nftGate = new VersionGate()
  const orderGate = new VersionGate()

  const handleEvent = (name: SocketEventName, payload: unknown) => {
    if (name === SOCKET_EVENTS.nftUpdated) {
      const parsed = nftUpdatedEventSchema.safeParse(payload)
      if (!parsed.success) return options.onDiscard?.({ name, reason: 'invalid', payload })
      if (!nftGate.accept(parsed.data)) return options.onDiscard?.({ name, reason: 'duplicate_or_stale', payload })
      applyNftUpdatedToCache(queryClient, parsed.data)
      return
    }
    const parsed = orderUpdatedEventSchema.safeParse(payload)
    if (!parsed.success) return options.onDiscard?.({ name, reason: 'invalid', payload })
    if (!orderGate.accept(parsed.data)) return options.onDiscard?.({ name, reason: 'duplicate_or_stale', payload })
    applyOrderUpdatedToCache(queryClient, parsed.data)
  }

  const connection: RealtimeConnection = openRealtimeConnection(getSocketSessionToken(), {
    onEvent: handleEvent,
    onConnect: ({ reconnected }) => {
      if (reconnected) refetchAfterReconnect(queryClient)
    },
  })

  // Só a queda liga o polling rápido aqui. A volta é coberta pelo `refetchAfterReconnect` (que também
  // reavalia o intervalo) e a troca de token (connected → idle → connecting → connected) não entra: o
  // `resetUserData` do login/logout já refaz as queries privadas uma vez.
  const unsubscribeStatus = realtimeStatusStore.subscribe((status, previous) => {
    if (status === 'reconnecting' && previous === 'connected') refetchPendingOrders(queryClient)
  })

  const unregisterSession = registerSocketSessionHandler((token) => {
    // Outra identidade: versões vistas pela conta anterior não valem para a nova.
    nftGate.reset()
    orderGate.reset()
    connection.setToken(token)
  })

  return () => {
    unregisterSession()
    unsubscribeStatus()
    connection.close()
  }
}
