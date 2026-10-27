import type { Socket } from 'socket.io-client'
import { createSocket } from './client'
import { SOCKET_EVENTS, type SocketEventName } from './events'
import { realtimeStatusStore } from './status'

export type RealtimeHandlers = {
  /** Evento do servidor, ainda não validado (quem consome valida com Zod e passa pelo `VersionGate`). */
  onEvent: (name: SocketEventName, payload: unknown) => void
  /**
   * Conectou. `reconnected` = voltou depois de uma queda (não conta a primeira conexão nem a troca de
   * token): hora de refazer as queries, porque eventos podem ter sido perdidos no intervalo.
   */
  onConnect?: (info: { reconnected: boolean }) => void
  /** Caiu. `willReconnect` = o client vai tentar de novo sozinho (não foi `close()`/troca de token). */
  onDisconnect?: (info: { reason: string; willReconnect: boolean }) => void
}

export type RealtimeConnection = {
  /** Troca a identidade: desconecta e reconecta com o novo `auth.token` (`null` = visitante). */
  setToken(token: string | null): void
  /** Encerra de vez (status `idle`). */
  close(): void
  readonly socket: Socket
}

/**
 * Abre a conexão Socket.IO e mantém `realtimeStatusStore` em dia. Sem regra de negócio: o que fazer com
 * cada evento fica com `handlers` (ver `app/realtime`). Só pode ser chamada depois de `worker.start()`
 * (o `socket.io-client` é importado por `./client`).
 */
export function openRealtimeConnection(token: string | null, handlers: RealtimeHandlers): RealtimeConnection {
  const socket = createSocket(token)
  let everConnected = false
  let closed = false

  socket.on('connect', () => {
    realtimeStatusStore.set('connected')
    handlers.onConnect?.({ reconnected: everConnected })
    everConnected = true
  })
  socket.on('disconnect', (reason) => {
    const willReconnect = socket.active && !closed
    realtimeStatusStore.set(willReconnect ? 'reconnecting' : 'idle')
    handlers.onDisconnect?.({ reason, willReconnect })
  })
  socket.on('connect_error', () => {
    // O Manager tenta de novo com backoff (1 s → 10 s) enquanto `socket.active`.
    if (!closed) realtimeStatusStore.set(socket.active ? 'reconnecting' : 'idle')
  })
  for (const name of Object.values(SOCKET_EVENTS)) {
    socket.on(name, (payload: unknown) => handlers.onEvent(name, payload))
  }

  realtimeStatusStore.set('connecting')
  socket.connect()

  return {
    socket,
    setToken(next) {
      if (closed) return
      socket.auth = next ? { token: next } : {}
      // Troca de identidade não é "reconexão": quem troca a sessão já refaz as queries (resetUserData).
      // Contar como reconexão somaria uma segunda rodada de refetch ao login.
      everConnected = false
      socket.disconnect()
      realtimeStatusStore.set('connecting')
      socket.connect()
    },
    close() {
      if (closed) return
      closed = true
      socket.disconnect()
      socket.removeAllListeners()
      realtimeStatusStore.set('idle')
    },
  }
}
