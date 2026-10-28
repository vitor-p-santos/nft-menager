import { cn } from '@/lib/utils'

/** Resultado de uma ação para a região `aria-live`: `status` (sucesso/informação) ou `error`. */
export type LiveFeedback = { tone: 'status' | 'error'; message: string } | null

type LiveMessageProps = {
  feedback: LiveFeedback
  /** `p` com `aria-live` ou `output` (papel `status`), conforme a tela já usava. */
  as?: 'p' | 'output'
  /** Cor do tom `status` (o erro é sempre `text-destructive`). */
  statusClassName?: string
  className?: string
}

/**
 * Mensagem anunciada por leitores de tela (`aria-live="polite"`), vermelha no erro. A região fica
 * sempre montada (o anúncio só sai se ela já existir); quem chama decide como escondê-la vazia
 * (`empty:hidden` ou `sr-only`).
 */
export function LiveMessage({ feedback, as: Tag = 'p', statusClassName = 'text-text-secondary', className }: LiveMessageProps) {
  return (
    <Tag aria-live="polite" className={cn(feedback?.tone === 'error' ? 'text-destructive' : statusClassName, className)}>
      {feedback?.message}
    </Tag>
  )
}
