import { useSyncExternalStore } from 'react'

/**
 * Estado da conexão em tempo real, sem depender do `socket.io-client` (pode ser lido por entities e
 * pelas `queryOptions`, ex.: o polling de fallback dos pedidos).
 * - `idle`: sem conexão aberta (antes do provider montar ou depois de `close()`);
 * - `connecting`: primeira tentativa em curso;
 * - `connected`: recebendo eventos;
 * - `reconnecting`: a conexão caiu (ou a primeira tentativa falhou) e o client está tentando de novo.
 */
export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting'

type Listener = (status: RealtimeStatus, previous: RealtimeStatus) => void

let current: RealtimeStatus = 'idle'
const listeners = new Set<Listener>()

export const realtimeStatusStore = {
  get: (): RealtimeStatus => current,
  set(next: RealtimeStatus) {
    if (next === current) return
    const previous = current
    current = next
    for (const listener of listeners) listener(next, previous)
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

/** `true` só com o socket conectado: aí os eventos substituem o polling. */
export const isRealtimeLive = () => current === 'connected'

const subscribeReact = (onChange: () => void) => realtimeStatusStore.subscribe(onChange)

/** Estado reativo da conexão, para o indicador de status (T-091). */
export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(subscribeReact, realtimeStatusStore.get, realtimeStatusStore.get)
}
