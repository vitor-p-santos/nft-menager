import type { Session } from '@/entities/session'
import { apiError } from '../http'
import { getScenarioValue, getSessionTtlMs } from '../scenarios'
import { loadTable, saveTable } from './storage'
import { usersTable, type UserRow } from './users'

/** Usuário autenticado visto pelo servidor simulado. */
export type SessionUser = { id: string }

type SessionRow = { userId: string; expiresAt: string; createdAt: string }
type SessionsByToken = Record<string, SessionRow>
const TABLE = 'sessions'
const all = () => loadTable<SessionsByToken>(TABLE, () => ({}))

const isExpired = (row: SessionRow, now = Date.now()) => Date.parse(row.expiresAt) <= now

export const sessionsTable = {
  /** Cria um token opaco com validade de `getSessionTtlMs()`; aproveita para descartar os vencidos. */
  create(userId: string): Session {
    const now = Date.now()
    const sessions = Object.fromEntries(Object.entries(all()).filter(([, row]) => !isExpired(row, now)))
    const token = `kurio_${crypto.randomUUID().replaceAll('-', '')}`
    const row: SessionRow = {
      userId,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + getSessionTtlMs()).toISOString(),
    }
    sessions[token] = row
    saveTable(TABLE, sessions)
    return { token, userId, expiresAt: row.expiresAt }
  },
  /** Troca de senha: derruba as outras sessões do usuário e mantém a atual. */
  revokeOthers(userId: string, keepToken: string) {
    const sessions = all()
    const kept = Object.fromEntries(Object.entries(sessions).filter(([token, row]) => token === keepToken || row.userId !== userId))
    saveTable(TABLE, kept)
  },
  /**
   * Usuário dono de um token válido, ou `null` (vencido, revogado, desconhecido ou cenário
   * `auth.session:expired`). Usado pelo socket simulado, que não tem `Request`.
   */
  userIdForToken(token: string): string | null {
    if (getScenarioValue('auth.session') === 'expired') return null
    const row = all()[token]
    if (!row || isExpired(row)) return null
    return usersTable.find(row.userId) ? row.userId : null
  },
  revoke(token: string) {
    const sessions = all()
    if (!(token in sessions)) return
    delete sessions[token]
    saveTable(TABLE, sessions)
  },
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null
  return token || null
}

/**
 * Estado da sessão da requisição:
 * - `none`: sem `Authorization` (visitante);
 * - `expired`: token enviado mas vencido, revogado, desconhecido (banco resetado) ou cenário
 *   `auth.session:expired` ativo → o client deve responder com o fluxo de reautenticação;
 * - `valid`: token válido; o usuário vem sempre do token, nunca do corpo da requisição.
 */
export type SessionResolution =
  | { status: 'none' }
  | { status: 'expired' }
  | { status: 'valid'; token: string; user: UserRow; session: Session }

export function resolveSession(request: Request): SessionResolution {
  const token = bearerToken(request)
  if (!token) return { status: 'none' }
  if (getScenarioValue('auth.session') === 'expired') return { status: 'expired' }
  const row = all()[token]
  if (!row || isExpired(row)) return { status: 'expired' }
  const user = usersTable.find(row.userId)
  if (!user) return { status: 'expired' }
  return { status: 'valid', token, user, session: { token, userId: user.id, expiresAt: row.expiresAt } }
}

/** Usuário da requisição, ou `null` sem sessão válida (para rotas que aceitam visitante). */
export function getSessionUser(request: Request): SessionUser | null {
  const resolved = resolveSession(request)
  return resolved.status === 'valid' ? { id: resolved.user.id } : null
}

export const unauthorizedResponse = () => apiError(401, 'unauthorized', 'Entre para continuar')
export const sessionExpiredResponse = () => apiError(401, 'session_expired', 'Sua sessão expirou. Entre novamente.')

/** Para rotas autenticadas: devolve o usuário ou a resposta 401 adequada (`unauthorized`/`session_expired`). */
export type AuthenticatedSession = { user: UserRow; token: string; session: Session }

export function authenticate(request: Request): (AuthenticatedSession & { error?: never }) | { error: Response } {
  const resolved = resolveSession(request)
  if (resolved.status === 'valid') return resolved
  return { error: resolved.status === 'expired' ? sessionExpiredResponse() : unauthorizedResponse() }
}
