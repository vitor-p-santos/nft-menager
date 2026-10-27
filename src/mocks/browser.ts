import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { resumePendingSettlements } from './handlers/checkout'
import { socketHandlers } from './socket'
import { installMockRealtimeTools } from './socket/dev-tools'

export const worker = setupWorker(...handlers, ...socketHandlers)

// Pagamentos que estavam em curso antes do refresh voltam a concluir (e a emitir `order.updated`).
resumePendingSettlements()
installMockRealtimeTools()
