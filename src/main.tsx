import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'false') return
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass', quiet: import.meta.env.PROD })
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
