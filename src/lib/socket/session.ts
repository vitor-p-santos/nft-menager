/**
 * Ponte entre a sessão e o Socket.IO, sem depender de `socket.io-client` (pode ser importada
 * em qualquer lugar). A auth chama `resetSocketSession(token)` em login, logout, expiração e
 * troca de conta; o SocketProvider (Fase 8, T-090) registra o handler que desconecta, reconecta
 * com o novo `auth.token`, reseta os `VersionGate` e refaz as subscriptions.
 *
 * Até lá não há handler registrado: a chamada só guarda o último token, que o provider lê ao montar.
 */
type SocketSessionHandler = (token: string | null) => void

let handler: SocketSessionHandler | null = null
let lastToken: string | null = null

export function registerSocketSessionHandler(next: SocketSessionHandler) {
  handler = next
  return () => {
    if (handler === next) handler = null
  }
}

export function resetSocketSession(token: string | null) {
  lastToken = token
  handler?.(token)
}

/** Último token informado (o provider usa ao conectar pela primeira vez). */
export function getSocketSessionToken() {
  return lastToken
}
