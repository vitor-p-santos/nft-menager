import { io, type Socket } from 'socket.io-client'
import { SOCKET_URL } from './config'

/**
 * Cria a conexão Socket.IO. `transports: ['websocket']` é necessário para que o
 * @mswjs/socket.io-binding intercepte a conexão (ele não simula long-polling).
 * A conexão é aberta/fechada pelo SocketProvider conforme a sessão.
 *
 * IMPORTANTE: o engine.io-client captura `globalThis.WebSocket` ao ser carregado,
 * por isso este módulo só pode ser importado depois de `worker.start()` (ver main.tsx).
 */
export function createSocket(token: string | null): Socket {
  return io(SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    auth: token ? { token } : {},
  })
}
