import { useSyncExternalStore } from 'react'

/**
 * Estado do modal de autenticação desktop (Figma Sign In/Sign Up Modal). Store externo porque é
 * aberto de lugares diferentes: botão "Entrar" do header e expiração de sessão.
 * - `notice`: aviso exibido acima do formulário (ex.: "Sua sessão expirou").
 * No mobile não há modal: as mesmas ações levam às páginas `/entrar` e `/cadastro`.
 */
export type AuthView = 'login' | 'register' | 'forgot'
export type AuthDialogState = { open: boolean; view: AuthView; notice: string | null }

let state: AuthDialogState = { open: false, view: 'login', notice: null }
/** Elemento focado ao abrir (sem DialogTrigger o Radix não sabe para onde devolver o foco). */
let returnFocus: HTMLElement | null = null
const listeners = new Set<() => void>()

function set(next: AuthDialogState) {
  state = next
  for (const listener of listeners) listener()
}

export const authDialog = {
  open: (view: AuthView = 'login', notice: string | null = null) => {
    if (!state.open) returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    set({ open: true, view, notice })
  },
  setView: (view: AuthView) => set({ ...state, view }),
  close: () => set({ ...state, open: false, notice: null }),
  /** Devolve o foco a quem abriu o modal, se ainda estiver na página (ex.: o botão "Entrar"). */
  restoreFocus: (): boolean => {
    const target = returnFocus
    returnFocus = null
    if (!target?.isConnected) return false
    target.focus()
    return true
  },
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getState = () => state

export function useAuthDialog(): AuthDialogState {
  return useSyncExternalStore(subscribe, getState, getState)
}

/** Abaixo de `md` (48rem) as telas de auth são páginas; a partir dele, modal. */
export const DESKTOP_QUERY = '(min-width: 48rem)'
export function isDesktopViewport() {
  return typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches
}
