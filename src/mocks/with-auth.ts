import type { HttpResponseResolver } from 'msw'
import { authenticate, type AuthenticatedSession } from './db/session'

type ResolverInfo = Parameters<HttpResponseResolver>[0]

/** Resolver de rota autenticada: recebe, além do `info` do MSW, a sessão válida da requisição. */
export type AuthedResolver = (info: ResolverInfo, auth: AuthenticatedSession) => ReturnType<HttpResponseResolver>

/**
 * Exige sessão válida: sem `Authorization` responde 401 `unauthorized`; token vencido, revogado ou
 * desconhecido responde 401 `session_expired`. O usuário vem sempre do token, nunca do corpo.
 *
 * Uso: `withScenario(key, withAuth(resolver))`. O cenário fica por fora, então `unavailable`,
 * `failure`, `timeout` e `latency` respondem igual com ou sem sessão.
 */
export function withAuth(resolver: AuthedResolver): HttpResponseResolver {
  return (info) => {
    const auth = authenticate(info.request)
    if (auth.error) return auth.error
    return resolver(info, auth)
  }
}
