import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/lib/zod-locale'
import '@/styles/globals.css'

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'false') return
  const [{ worker }, { installMockingKeepalive, reactivateMocking }, { configureTransportRecovery }] = await Promise.all([
    import('@/mocks/browser'),
    import('@/mocks/worker-recovery'),
    import('@/lib/api'),
  ])
  await worker.start({ onUnhandledRequest: 'bypass', quiet: import.meta.env.PROD })
  // O navegador desliga o worker ocioso e ele volta sem saber desta aba (ver mocks/worker-recovery.ts)
  installMockingKeepalive()
  configureTransportRecovery({ recover: reactivateMocking })
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemento #root não encontrado')

// O app é importado só depois do MSW: o engine.io-client (socket.io) captura
// `globalThis.WebSocket` no carregamento e precisa enxergar a versão interceptada.
await enableMocking()
const { AppProviders } = await import('@/app/providers')

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
)
