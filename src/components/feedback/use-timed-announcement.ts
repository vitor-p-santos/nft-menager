import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Anúncio que some sozinho depois de `ms` (balões de "Link copiado", "Adicionado aos favoritos").
 * Um anúncio novo reinicia o tempo; o timer é limpo ao desmontar. `announce` é estável.
 */
export function useTimedAnnouncement<T>(defaultMs = 4000) {
  const [value, setValue] = useState<T | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const announce = useCallback(
    (next: T, ms = defaultMs) => {
      window.clearTimeout(timer.current)
      setValue(next)
      timer.current = window.setTimeout(() => setValue(null), ms)
    },
    [defaultMs],
  )

  return [value, announce] as const
}
