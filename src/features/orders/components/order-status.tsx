import { CircleAlertIcon, CircleCheckIcon, ClockIcon } from 'lucide-react'
import type { OrderStatus } from '@/entities/order'
import { cn } from '@/lib/utils'
import { ORDER_STATUS_LABELS } from './order-labels'

const BADGE_STYLES: Record<OrderStatus, string> = {
  pending: 'border-primary text-text-accent',
  confirmed: 'border-success text-success',
  rejected: 'border-destructive text-destructive',
}

/**
 * Selo de estado (sem frame no Figma, ver ARCHITECTURE.md → Pedidos: telas): borda e texto na cor
 * semântica do tema (âmbar, `success`, `destructive`) e um ícone, para não depender só da cor.
 */
export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const Icon = { pending: ClockIcon, confirmed: CircleCheckIcon, rejected: CircleAlertIcon }[status]
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-sm border px-2 text-caption leading-4 font-bold whitespace-nowrap',
        BADGE_STYLES[status],
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {ORDER_STATUS_LABELS[status]}
    </span>
  )
}
