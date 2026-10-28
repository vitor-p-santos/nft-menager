/**
 * O navegador desliga o service worker ocioso (aba em segundo plano, onde o keepalive do MSW é
 * estrangulado). Ao voltar, o worker perdeu a lista em memória das abas que ativaram o mock
 * (`activeClientIds` em `mockServiceWorker.js`) e deixa toda requisição seguir para a rede: no deploy
 * a `/api` vira o `index.html` ou um 404 do host, e o app mostra carrinho vazio e erros.
 *
 * O worker aceita `MOCK_ACTIVATE` a qualquer momento (idempotente) e responde `MOCKING_ENABLED`, então
 * esta aba se reativa junto com o keepalive, ao voltar a ficar visível e, sob demanda, quando o client
 * da API recebe uma resposta fora do contrato (`configureTransportRecovery`). O `mockServiceWorker.js`
 * fica intacto: ele é regenerado pelo `msw init`.
 */

const KEEPALIVE_MS = 5_000
const ACTIVATION_TIMEOUT_MS = 3_000

/** Reativa o mock para esta aba e espera a confirmação do worker. */
export function reactivateMocking(): Promise<boolean> {
  const controller = navigator.serviceWorker?.controller
  if (!controller) return Promise.resolve(false)
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      window.clearTimeout(timer)
      navigator.serviceWorker.removeEventListener('message', onMessage)
      resolve(ok)
    }
    const onMessage = (event: MessageEvent<{ type?: string } | null>) => {
      if (event.data?.type === 'MOCKING_ENABLED') done(true)
    }
    const timer = window.setTimeout(() => done(false), ACTIVATION_TIMEOUT_MS)
    navigator.serviceWorker.addEventListener('message', onMessage)
    controller.postMessage('MOCK_ACTIVATE')
  })
}

/** Reativação preventiva: reduz a janela em que uma requisição sai antes da recuperação sob demanda. */
export function installMockingKeepalive() {
  const activate = () => navigator.serviceWorker?.controller?.postMessage('MOCK_ACTIVATE')
  window.setInterval(activate, KEEPALIVE_MS)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && activate())
  window.addEventListener('focus', activate)
  window.addEventListener('pageshow', activate)
}
