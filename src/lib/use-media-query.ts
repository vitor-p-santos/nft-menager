import { useCallback, useSyncExternalStore } from 'react'

/**
 * `matchMedia` reativo. Usado para dar prioridade de carregamento só à imagem LCP da variante
 * visível (mobile × desktop renderizam artes diferentes e a oculta fica `lazy`, sem download).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Mesmo corte do header desktop e das telas de auth (`md`, 48rem). */
export const MD_QUERY = '(min-width: 48rem)'
