import { toSocketIo } from '@mswjs/socket.io-binding'
import type { WebSocketHandlerConnection } from 'msw'
import type { EventEnvelope, SocketEventName } from '@/lib/socket/events'
import { sessionsTable } from '../db/session'

/**
 * "Servidor" Socket.IO simulado: registro das conexões, autenticação pelo token do handshake,
 * entrega por público (todos) ou por usuário, histórico curto (para `__mockRealtime`) e queda forçada.
 *
 * O MSW roda dentro de cada aba, então cada aba tem o seu servidor. Para uma mudança feita numa aba
 * (ex.: pagamento concluído) chegar às outras abas do mesmo navegador, as emissões são repassadas por
 * `BroadcastChannel` e entregues às conexões locais de cada aba.
 */

/** Público de um evento: todos (`nft.updated`) ou só as conexões autenticadas como o usuário (`order.updated`). */
export type Audience = { kind: 'public' } | { kind: 'user'; userId: string }

export type EmittedEvent = {
  name: SocketEventName | (string & {})
  payload: Record<string, unknown>
  audience: Audience
}

type MockClient = {
  raw: WebSocketHandlerConnection
  io: ReturnType<typeof toSocketIo>
  /** Token recebido no pacote CONNECT (`auth: { token }`); `null` = visitante. */
  token: string | null
  pingTimer: ReturnType<typeof setInterval>
}

/** O binding anuncia `pingInterval: 25000` no handshake; sem ping o client derruba a conexão em 30 s. */
const PING_EVERY_MS = 20_000
const HISTORY_LIMIT = 50
const CHANNEL_NAME = 'kurio:mock-realtime'

const clients = new Set<MockClient>()
const history: EmittedEvent[] = []
let downUntil = 0

const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME)
channel?.addEventListener('message', (message: MessageEvent<EmittedEvent>) => {
  record(message.data)
  deliverLocal(message.data)
})

/**
 * Pacote CONNECT do Socket.IO no namespace padrão: `40{"token":"..."}` (engine.io MESSAGE `4` +
 * socket.io CONNECT `0` + payload de `auth`).
 */
function readConnectToken(data: unknown): string | null | undefined {
  if (typeof data !== 'string' || !data.startsWith('40')) return undefined
  const body = data.slice(2)
  if (!body.startsWith('{')) return null
  try {
    const auth: unknown = JSON.parse(body)
    const token = typeof auth === 'object' && auth !== null ? (auth as { token?: unknown }).token : undefined
    return typeof token === 'string' && token ? token : null
  } catch {
    return null
  }
}

/** Trata uma conexão que casou com o `ws.link`. */
export function acceptConnection(connection: WebSocketHandlerConnection) {
  // O casamento ignora a query string; sem `EIO` não é Socket.IO (ex.: o WebSocket de HMR do Vite
  // reconectando na mesma origem) → segue para a rede.
  if (!connection.client.url.searchParams.has('EIO')) {
    connection.server.connect()
    return
  }
  // Servidor "fora do ar" (`__mockRealtime.dropConnection({ downMs })`): recusa até voltar.
  // Recusa como um servidor inacessível: `error` e depois `close`. Só com `close`, o Manager do
  // socket.io-client não percebe a falha e espera o `timeout` (20 s) antes de tentar de novo.
  if (Date.now() < downUntil) {
    // `socket` existe na implementação (WebSocketClientConnection), mas não no tipo público do protocolo
    ;(connection.client as { socket?: EventTarget }).socket?.dispatchEvent(new Event('error'))
    connection.client.close(4000, 'mock server down')
    return
  }

  const client: MockClient = {
    raw: connection,
    io: toSocketIo(connection),
    token: null,
    pingTimer: setInterval(() => connection.client.send('2'), PING_EVERY_MS),
  }
  clients.add(client)
  connection.client.addEventListener('message', (event) => {
    const token = readConnectToken(event.data)
    if (token !== undefined) client.token = token
  })
  connection.client.addEventListener('close', () => release(client))
}

function release(client: MockClient) {
  clearInterval(client.pingTimer)
  clients.delete(client)
}

/** Usuário da conexão, validado a cada entrega: token vencido/revogado deixa de receber eventos privados. */
const userOf = (client: MockClient) => (client.token ? sessionsTable.userIdForToken(client.token) : null)

function deliverLocal({ name, payload, audience }: EmittedEvent) {
  for (const client of clients) {
    if (audience.kind === 'user' && userOf(client) !== audience.userId) continue
    client.io.client.emit(name, payload)
  }
}

function record(event: EmittedEvent) {
  history.push(event)
  if (history.length > HISTORY_LIMIT) history.shift()
}

/** Entrega o evento (nesta aba e nas outras) e guarda no histórico. */
export function publish(event: EmittedEvent) {
  record(event)
  deliverLocal(event)
  channel?.postMessage(event)
}

/** Envelope comum (contracts/socket-events.md): `eventId` único por emissão, `version` da entidade. */
export function envelope(entityId: string, version: number): EventEnvelope {
  return { eventId: `evt_${crypto.randomUUID()}`, entityId, version, emittedAt: new Date().toISOString() }
}

/** Últimos eventos emitidos (mais recente por último). */
export const recentEvents = (): readonly EmittedEvent[] => history

/**
 * Derruba todas as conexões desta aba (o client vê "transport close" e reconecta com backoff).
 * `downMs` > 0 recusa novas conexões nesse intervalo, simulando o servidor fora do ar.
 */
export function dropConnections(downMs = 0) {
  downUntil = downMs > 0 ? Date.now() + downMs : 0
  for (const client of [...clients]) {
    release(client)
    client.raw.client.close(4000, 'mock connection dropped')
  }
}

export function connectionStats() {
  const all = [...clients]
  return {
    connections: all.length,
    authenticated: all.filter((c) => userOf(c) !== null).length,
    down: Date.now() < downUntil,
  }
}
