import { ws } from 'msw'
import { SOCKET_URL } from '@/lib/socket/config'
import { acceptConnection } from './server'

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * T-090: o `WebSocketHandler` do MSW tira o prefixo `/socket.io/` do caminho e a query string antes de
 * comparar (`ws://host/socket.io/?EIO=4&transport=websocket` vira `ws://host/`). Por isso o padrão casa
 * a origem com ou sem o prefixo; antes ele exigia `/socket.io/` e nunca casava, e a conexão ia para a rede.
 */
export const realtime = ws.link(new RegExp(`^${escapeRegExp(SOCKET_URL)}/?(socket\\.io/?)?$`))

export const socketHandlers = [realtime.addEventListener('connection', acceptConnection)]

export { publishNftUpdated, publishOrderUpdated } from './events'
