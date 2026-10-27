// Módulo sem dependência de socket.io-client: pode ser importado pelos mocks
// sem carregar o engine.io-client antes de o MSW substituir o WebSocket.
const sameOrigin = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`

/** Por padrão, mesma origem do app — funciona em dev, preview e deploy. */
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? sameOrigin
