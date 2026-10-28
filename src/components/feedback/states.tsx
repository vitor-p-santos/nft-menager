import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type StateProps = {
  title: string
  description?: string
  action?: { label: string; onClick: () => void } | ReactNode
  className?: string
}

function StateAction({ action }: { action: StateProps['action'] }) {
  if (!action) return null
  if (typeof action === 'object' && action !== null && 'label' in action && 'onClick' in action) {
    return (
      <Button size="lg" onClick={action.onClick}>
        {action.label}
      </Button>
    )
  }
  return <>{action}</>
}

/**
 * Estados vazio e de erro (research.md, D-04): Body/14 com `text-muted-foreground` e um botão
 * primário. O erro é anunciado por `role="alert"`; o vazio, por `aria-live` educado.
 */
export function EmptyState({ title, description, action, className }: StateProps) {
  return (
    <output aria-live="polite" className={cn('flex flex-col items-center gap-4 px-6 py-12 text-center', className)}>
      <p className="text-lead leading-6 font-bold text-foreground">{title}</p>
      {description && <p className="max-w-md text-body leading-6 text-muted-foreground">{description}</p>}
      <StateAction action={action} />
    </output>
  )
}

export function ErrorState({ title, description, action, className }: StateProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-4 px-6 py-12 text-center', className)}>
      <p className="text-lead leading-6 font-bold text-foreground">{title}</p>
      {description && <p className="max-w-md text-body leading-6 text-muted-foreground">{description}</p>}
      <StateAction action={action} />
    </div>
  )
}
