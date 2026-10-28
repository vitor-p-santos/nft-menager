import { useCallback, useSyncExternalStore } from 'react'

/** Mesmo corte do header desktop e das telas de auth (`md`, 48rem). */
export const MD_QUERY = '(min-width: 48rem)'

/** Preferência do sistema por menos movimento. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** Leitura pontual (fora de render, ex.: num clique); `false` sem `window`. */
export function matchesMedia(query: string): boolean {
  return typeof window !== 'undefined' && window.matchMedia(query).matches
}

/** `true` quando o usuário pediu menos movimento no sistema operacional (leitura pontual). */
export function prefersReducedMotion(): boolean {
  return matchesMedia(REDUCED_MOTION_QUERY)
}

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

/** `prefersReducedMotion` reativo (autoplay do hero, por exemplo). */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY)
}
