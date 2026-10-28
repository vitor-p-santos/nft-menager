import axios, { isAxiosError, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import type { z } from 'zod'
import { getCartId } from './cart-id'
import { ApiError, toApiError } from './errors'

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
export const API_TIMEOUT_MS = 10_000

export type UnauthorizedContext = {
  error: ApiError
  /** Token enviado na requisição que falhou (`null` se foi sem sessão). */
  token: string | null
}

type SessionHooks = {
  getToken: () => string | null
  /** Todo 401. O bridge da auth trata `session_expired` (limpa a sessão e avisa a UI). */
  onUnauthorized: (context: UnauthorizedContext) => void
}

let sessionHooks: SessionHooks = {
  getToken: () => null,
  onUnauthorized: () => {},
}

/** Registrado pela feature de auth no bootstrap — evita dependência circular lib → feature. */
export function configureSession(hooks: SessionHooks) {
  sessionHooks = hooks
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = sessionHooks.getToken()
  // Um `Authorization` explícito vence o da sessão (ex.: o merge do carrinho no login usa o token novo
  // antes de ele virar a sessão atual).
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`
  // Carrinho anônimo; com sessão o servidor usa o carrinho do usuário
  config.headers['X-Cart-Id'] = getCartId()
  return config
})

type TransportRecovery = {
  /** Tenta fazer as próximas requisições chegarem à API (ex.: reativar o worker do MSW). `true` se conseguiu. */
  recover: () => Promise<boolean>
}

let transportRecovery: TransportRecovery | null = null

/**
 * Registrado pelo bootstrap quando a API é simulada no navegador (MSW). Sem ele, uma resposta fora do
 * contrato segue o caminho normal de erro.
 */
export function configureTransportRecovery(recovery: TransportRecovery | null) {
  transportRecovery = recovery
}

/**
 * A API sempre responde JSON: corpo vazio só em sucesso (202/204), e todo erro traz `{ code, message }`.
 * Fora disso (o `index.html` do rewrite de SPA, o 404 do host, vazio ou em texto), a requisição não chegou
 * à API: com o MSW, o navegador desligou o service worker ocioso e ele voltou sem saber desta aba.
 */
function isOffContract(response: AxiosResponse): boolean {
  if (String(response.headers['content-type'] ?? '').includes('application/json')) return false
  const body = response.data as unknown
  const empty = body === '' || body === null || body === undefined
  return response.status >= 400 || !empty
}

type RetriableConfig = InternalAxiosRequestConfig & { _transportRetried?: boolean }

/** Reativa o transporte e repete a requisição uma vez; `null` se não há como recuperar. */
async function retryAfterRecovery(config: RetriableConfig | undefined) {
  if (!transportRecovery || !config || config._transportRetried) return null
  if (!(await transportRecovery.recover())) return null
  config._transportRetried = true
  return http.request(config)
}

const offContractError = (status: number) =>
  new ApiError({ kind: 'unavailable', status, code: 'off_contract', message: 'O serviço não respondeu como esperado. Tente novamente.' })

http.interceptors.response.use(
  async (response) => {
    if (!isOffContract(response)) return response
    const retried = await retryAfterRecovery(response.config)
    if (retried) return retried
    throw offContractError(response.status)
  },
  async (error: unknown) => {
    const response = isAxiosError(error) ? error.response : undefined
    if (response && isOffContract(response)) {
      const retried = await retryAfterRecovery(response.config)
      if (retried) return retried
      // O 404/405 do host não é um "não encontrado" da API
      return Promise.reject(offContractError(response.status))
    }
    const apiError = toApiError(error)
    if (apiError.kind === 'unauthorized') {
      const header = isAxiosError(error) ? error.config?.headers?.Authorization : undefined
      const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
      sessionHooks.onUnauthorized({ error: apiError, token })
    }
    return Promise.reject(apiError)
  },
)

/**
 * Cliente tipado: toda resposta é validada com o schema Zod do contrato,
 * garantindo que o tipo em runtime corresponda ao tipo estático.
 */
export const api = {
  async get<S extends z.ZodType>(url: string, schema: S, config?: AxiosRequestConfig) {
    const { data } = await http.get<unknown>(url, config)
    return schema.parse(data) as z.infer<S>
  },
  async post<S extends z.ZodType>(url: string, body: unknown, schema: S, config?: AxiosRequestConfig) {
    const { data } = await http.post<unknown>(url, body, config)
    return schema.parse(data) as z.infer<S>
  },
  async put<S extends z.ZodType>(url: string, body: unknown, schema: S, config?: AxiosRequestConfig) {
    const { data } = await http.put<unknown>(url, body, config)
    return schema.parse(data) as z.infer<S>
  },
  async patch<S extends z.ZodType>(url: string, body: unknown, schema: S, config?: AxiosRequestConfig) {
    const { data } = await http.patch<unknown>(url, body, config)
    return schema.parse(data) as z.infer<S>
  },
  async delete(url: string, config?: AxiosRequestConfig) {
    await http.delete(url, config)
  },
}
