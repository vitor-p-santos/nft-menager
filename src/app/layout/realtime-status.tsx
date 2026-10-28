import { useEffect, useState } from 'react'
// Import direto (sem o index): o store não depende do socket.io-client
import { realtimeStatusStore } from '@/lib/socket/status'
import { cn } from '@/lib/utils'

/** Só aparece se a queda durar mais que isso (evita piscar numa reconexão rápida ou no 1º connect). */
const SHOW_DELAY_MS = 1500
/** Tempo do aviso "de volta" depois de reconectar. */
const BACK_MS = 3000

type Notice = { kind: 'down' | 'back'; text: string } | null

/**
 * Indicador do tempo real (T-091). Sem frame no Figma: um selo discreto, fixo no canto (fora do fluxo,
 * sem layout shift), em Surface Card com borda Color/Border e Caption/12. Fica oculto com a conexão
 * saudável e aparece só quando ela cai ("Reconectando…") e, por alguns segundos, quando volta.
 * A mesma região `aria-live="polite"` anuncia as duas mudanças.
 */
export function RealtimeStatus() {
  const [notice, setNotice] = useState<Notice>(null)

  // Assina o store da conexão (sistema externo): as transições disparam os avisos e os timers.
  useEffect(() => {
    let timer: number | undefined
    let wasDown = false
    const unsubscribe = realtimeStatusStore.subscribe((status) => {
      if (status === 'connecting') return
      window.clearTimeout(timer)
      if (status === 'reconnecting') {
        timer = window.setTimeout(() => {
          wasDown = true
          setNotice({ kind: 'down', text: 'Reconectando às atualizações em tempo real…' })
        }, SHOW_DELAY_MS)
      } else if (status === 'connected' && wasDown) {
        wasDown = false
        setNotice({ kind: 'back', text: 'Atualizações em tempo real restabelecidas.' })
        timer = window.setTimeout(() => setNotice(null), BACK_MS)
      } else {
        // Reconexão rápida (antes do atraso), 1º connect ou sessão encerrada: nada a mostrar
        wasDown = false
        setNotice(null)
      }
    })
    return () => {
      unsubscribe()
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <output
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed bottom-[140px] left-1/2 z-50 flex w-max max-w-[calc(100%-3rem)] -translate-x-1/2 items-center gap-2 rounded-md border border-border bg-surface-card px-3 py-2 text-caption leading-4 text-foreground shadow-lg md:bottom-6 md:left-6 md:translate-x-0',
        !notice && 'sr-only',
      )}
    >
      {notice && (
        <>
          <span
            aria-hidden
            className={cn('size-2 shrink-0 rounded-full', notice.kind === 'down' ? 'bg-primary motion-safe:animate-pulse' : 'bg-success')}
          />
          {notice.text}
        </>
      )}
    </output>
  )
}
