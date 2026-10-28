import { delay, type HttpResponseResolver } from 'msw'
import { API_TIMEOUT_MS } from '@/lib/api'
import { apiError } from '../http'

/**
 * Cenários reproduzíveis por endpoint. Configurados via localStorage
 * (`mock:scenarios` = {"checkout.create": "timeout"}) ou query string
 * (`?mock=checkout.create:timeout,catalog.list:latency`), permitindo que
 * testes Playwright e QA manual forcem cada comportamento.
 */
export const SCENARIOS = ['success', 'failure', 'latency', 'timeout', 'conflict', 'unavailable'] as const
export type Scenario = (typeof SCENARIOS)[number]

const STORAGE_KEY = 'mock:scenarios'
const LATENCY_MS = 2_500

function isScenario(value: string): value is Scenario {
  return (SCENARIOS as readonly string[]).includes(value)
}

function readFromQuery(): Record<string, string> {
  const raw = new URLSearchParams(globalThis.location?.search ?? '').get('mock')
  if (!raw) return {}
  return Object.fromEntries(
    raw
      .split(',')
      .map((pair) => pair.split(':') as [string, string | undefined])
      .filter((pair): pair is [string, string] => pair[1] !== undefined && pair[1] !== ''),
  )
}

function readFromStorage(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (typeof parsed !== 'object' || parsed === null) return {}
    return Object.fromEntries(Object.entries(parsed).filter((e): e is [string, string] => typeof e[1] === 'string'))
  } catch {
    return {}
  }
}

/**
 * Valor bruto configurado para `key` (query string tem prioridade sobre o localStorage).
 * Usado por chaves com valores próprios, fora de `SCENARIOS`: `auth.session` = `expired`
 * e `payment.outcome` = `confirm` | `reject`.
 */
export function getScenarioValue(key: string): string | undefined {
  return { ...readFromStorage(), ...readFromQuery() }[key]
}

export function getScenario(key: string): Scenario {
  const map = { ...readFromStorage(), ...readFromQuery() }
  const own = map[key]
  if (own !== undefined && isScenario(own)) return own
  const fallback = map['*']
  return fallback !== undefined && isScenario(fallback) ? fallback : 'success'
}

const DEFAULT_SESSION_TTL_MS = 15 * 60_000
const SESSION_TTL_KEY = 'mock:session-ttl'

/**
 * Validade dos tokens criados no login (research.md T-05): 15 min por padrão, configurável em
 * segundos por `localStorage['mock:session-ttl']` ou `?sessionTtl=` (ex.: `?sessionTtl=5`).
 */
export function getSessionTtlMs(): number {
  let raw: string | null = new URLSearchParams(globalThis.location?.search ?? '').get('sessionTtl')
  if (raw === null) {
    try {
      raw = localStorage.getItem(SESSION_TTL_KEY)
    } catch {
      raw = null
    }
  }
  const seconds = raw === null ? Number.NaN : Number(raw)
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1_000 : DEFAULT_SESSION_TTL_MS
}

export function setScenarios(map: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export type ScenarioOptions = {
  /**
   * O handler modela o `conflict` com uma regra real (ex.: o checkout altera o preço no banco e a
   * revalidação devolve 409 `price_changed`). Sem isso, `conflict` vira um 409 genérico.
   */
  handlesConflict?: boolean
  /**
   * `timeout` executa o resolver (o efeito acontece no servidor) e só então atrasa a resposta além
   * do timeout do client. Simula "o pedido foi criado, mas a resposta se perdeu" (recuperação por
   * `Idempotency-Key`). Sem isso, o atraso vem antes do resolver.
   */
  timeoutAfterResolve?: boolean
}

/**
 * Envolve um resolver aplicando o cenário configurado para `key`.
 * `conflict` só é aplicado aqui quando o próprio handler não o modela
 * (regras de conflito reais — preço/estoque — ficam no handler, ver `ScenarioOptions`).
 */
export function withScenario(key: string, resolver: HttpResponseResolver, options: ScenarioOptions = {}): HttpResponseResolver {
  return async (info) => {
    const scenario = getScenario(key)
    switch (scenario) {
      case 'latency':
        await delay(LATENCY_MS)
        return resolver(info)
      case 'timeout': {
        if (!options.timeoutAfterResolve) {
          await delay(API_TIMEOUT_MS + 1_000)
          return resolver(info)
        }
        const response = await resolver(info)
        await delay(API_TIMEOUT_MS + 1_000)
        return response
      }
      case 'failure':
        return apiError(500, 'internal_error', 'Erro interno simulado')
      case 'unavailable':
        return apiError(503, 'service_unavailable', 'Serviço indisponível')
      case 'conflict':
        if (options.handlesConflict) {
          await delay()
          return resolver(info)
        }
        return apiError(409, 'conflict', 'Conflito simulado')
      case 'success':
        await delay()
        return resolver(info)
    }
  }
}
