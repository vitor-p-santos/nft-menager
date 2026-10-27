import axios, { isAxiosError, type AxiosRequestConfig } from 'axios'
import type { z } from 'zod'
import { getCartId } from './cart-id'
import { toApiError, type ApiError } from './errors'

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

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
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
