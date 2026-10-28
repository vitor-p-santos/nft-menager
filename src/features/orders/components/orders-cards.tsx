import { Link } from '@tanstack/react-router'
import type { Order } from '@/entities/order'
import { formatReceiptDate } from '@/entities/order/format'
import { formatEthLabel } from '@/lib/money'
import { ORDER_STATUS_LABELS } from './order-labels'
import { actionLabel, orderRef, orderTitle } from './order-format'
import { OrderThumb } from './order-thumb'
import { OrderStatusBadge } from './order-status'

/**
 * Mobile e tablet: cards no padrão "Cart Items" mobile (100px, raio 14, sombra do card do
 * carrinho). O card inteiro é clicável pelo link do título (área estendida com `after:`).
 */
export function OrdersCards({ orders }: { orders: Order[] }) {
  return (
    <ul aria-label="Seus pedidos" className="grid gap-5 md:grid-cols-2">
      {orders.map((order) => (
        <li key={order.id} className="relative flex min-h-[100px] rounded-[14px] bg-card shadow-cart-card focus-within:ring-2 focus-within:ring-ring">
          <OrderThumb order={order} size={100} className="size-[100px] rounded-[14px]" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-[13px] pr-3 pl-[9px] leading-4">
            <Link
              to="/pedidos/$orderId"
              params={{ orderId: order.id }}
              className="truncate text-body-md font-bold text-foreground outline-none after:absolute after:inset-0 after:rounded-[14px] after:content-['']"
            >
              {orderTitle(order)}
              <span className="sr-only">
                , {ORDER_STATUS_LABELS[order.status]}. {actionLabel(order)}
              </span>
            </Link>
            <span className="text-body text-text-secondary">
              {formatReceiptDate(order.createdAt)} · {orderRef(order.id)}
            </span>
            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
              <span className="text-body-lg leading-5 font-bold whitespace-nowrap text-text-accent md:text-lead">
                <span className="sr-only">Total: </span>
                {formatEthLabel(order.totals.totalWei)}
              </span>
              <OrderStatusBadge status={order.status} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
