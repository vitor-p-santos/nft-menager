import { useSyncExternalStore } from 'react'
import { matchesMedia, MD_QUERY } from '@/lib/use-media-query'

/**
 * Estado do modal de autenticação desktop (Figma Sign In/Sign Up Modal). Store externo porque é
 * aberto de lugares diferentes: botão "Entrar" do header e expiração de sessão.
 * - `notice`: aviso exibido acima do formulário (ex.: "Sua sessão expirou").
 * - `redirect`: para onde ir depois de entrar (as páginas `/entrar` e `/cadastro` viram este modal a
 *   partir de `md` e passam o `redirect` delas); `null` = continua na tela atual.
 * No mobile não há modal: as mesmas ações levam às páginas `/entrar` e `/cadastro`.
 */
export type AuthView = 'login' | 'register' | 'forgot'
export type AuthDialogState = { open: boolean; view: AuthView; notice: string | null; redirect: string | null }

let state: AuthDialogState = { open: false, view: 'login', notice: null, redirect: null }
/** Elemento focado ao abrir (sem DialogTrigger o Radix não sabe para onde devolver o foco). */
let returnFocus: HTMLElement | null = null
const listeners = new Set<() => void>()

function set(next: AuthDialogState) {
  state = next
  for (const listener of listeners) listener()
}

export const authDialog = {
  open: (view: AuthView = 'login', notice: string | null = null, redirect: string | null = null) => {
    if (!state.open) returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    set({ open: true, view, notice, redirect })
  },
  setView: (view: AuthView) => set({ ...state, view }),
  close: () => set({ ...state, open: false, notice: null, redirect: null }),
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
export function isDesktopViewport() {
  return matchesMedia(MD_QUERY)
}
