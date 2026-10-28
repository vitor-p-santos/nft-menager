import { useSyncExternalStore } from 'react'
import { z } from 'zod'
import { authResponseSchema, type AuthResponse, type Session, type User } from './schema'

/**
 * Sessão do client (token + usuário) em localStorage (`kurio:session`), exposta como store externo.
 * - O servidor é a autoridade sobre a validade: o token é enviado até a API responder
 *   401 `session_expired`; aí o bridge da feature auth chama `expireSession()`.
 * - Outras abas: o evento `storage` relê o valor e notifica com `source: 'external'`, para que o
 *   bridge também limpe o cache quando a conta muda em outra aba.
 * Acesso ao storage sempre em try/catch (modo privado/bloqueado): sem storage a sessão vale só em memória.
 */
const STORAGE_KEY = 'kurio:session'

export type SessionState = AuthResponse | null
export type SessionChangeSource = 'local' | 'external'
export type SessionChangeReason = 'login' | 'logout' | 'expired' | 'refresh' | 'external'
type Listener = (state: SessionState, change: { source: SessionChangeSource; reason: SessionChangeReason }) => void

function readStorage(): SessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = authResponseSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function writeStorage(state: SessionState) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage indisponível: a sessão fica só em memória
  }
}

let current: SessionState = readStorage()
const listeners = new Set<Listener>()

function emit(source: SessionChangeSource, reason: SessionChangeReason) {
  for (const listener of listeners) listener(current, { source, reason })
}

function set(state: SessionState, reason: SessionChangeReason) {
  current = state
  writeStorage(state)
  emit('local', reason)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return
    const next = readStorage()
    if (next?.session.token === current?.session.token) return
    current = next
    emit('external', 'external')
  })
}

export const sessionStore = {
  get: (): SessionState => current,
  getToken: (): string | null => current?.session.token ?? null,
  getUser: (): User | null => current?.user ?? null,
  getSession: (): Session | null => current?.session ?? null,
  isAuthenticated: (): boolean => current !== null,
  /** Login, cadastro e OAuth. */
  signIn: (auth: AuthResponse) => set(auth, 'login'),
  /** Atualiza o usuário/sessão sem trocar de conta (ex.: `GET /auth/me`, perfil editado). */
  refresh: (auth: AuthResponse) => {
    if (current && current.user.id !== auth.user.id) return set(auth, 'login')
    set(auth, 'refresh')
  },
  updateUser: (user: User) => {
    if (!current || current.user.id !== user.id) return
    set({ ...current, user }, 'refresh')
  },
  signOut: () => {
    if (current) set(null, 'logout')
  },
  /** 401 `session_expired`. Devolve false se já não havia sessão (vários requests falhando juntos). */
  expire: (): boolean => {
    if (!current) return false
    set(null, 'expired')
    return true
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

const subscribeReact = (onChange: () => void) => sessionStore.subscribe(onChange)

/** Usuário logado ou `null`. */
export function useCurrentUser(): User | null {
  return useSyncExternalStore(subscribeReact, sessionStore.getUser, sessionStore.getUser)
}

// ---------------------------------------------------------------------------------------------
// Evento "sessão expirada": a UI escuta para abrir o login com `redirect` (rota + search atuais).

export const sessionExpiredEventSchema = z.object({ code: z.literal('session_expired'), message: z.string() })
export type SessionExpiredEvent = z.infer<typeof sessionExpiredEventSchema>
type ExpiredListener = (event: SessionExpiredEvent) => void

const expiredListeners = new Set<ExpiredListener>()

/** Inscreve a UI no evento de expiração. Devolve a função de cancelamento (use em `useEffect`). */
export function onSessionExpired(listener: ExpiredListener) {
  expiredListeners.add(listener)
  return () => {
    expiredListeners.delete(listener)
  }
}

export function emitSessionExpired(event: SessionExpiredEvent) {
  for (const listener of expiredListeners) listener(event)
}
