import { CircleAlertIcon, CircleCheckIcon, ClockIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { OrderStatus } from '@/entities/order'
import { ORDER_STATUS_LABELS } from './order-labels'

const BADGE_TONES: Record<OrderStatus, 'accent' | 'success' | 'destructive'> = {
  pending: 'accent',
  confirmed: 'success',
  rejected: 'destructive',
}

/**
 * Selo de estado (sem frame no Figma, ver ARCHITECTURE.md → Pedidos: telas): borda e texto na cor
 * semântica do tema (âmbar, `success`, `destructive`) e um ícone, para não depender só da cor.
 */
export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const Icon = { pending: ClockIcon, confirmed: CircleCheckIcon, rejected: CircleAlertIcon }[status]
  return (
    <Badge variant="status" tone={BADGE_TONES[status]} className={className}>
      <Icon aria-hidden className="size-3.5" />
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  )
}
