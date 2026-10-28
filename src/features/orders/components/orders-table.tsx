import { Link } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button-variants'
import type { Order } from '@/entities/order'
import { formatReceiptDate, orderEditionsCount } from '@/entities/order/format'
import { formatEthLabel } from '@/lib/money'
import { cn } from '@/lib/utils'
import { actionLabel, orderRef, orderTitle } from './order-format'
import { OrderThumb } from './order-thumb'
import { OrderStatusBadge } from './order-status'

/** Desktop (xl): tabela no padrão "Cart Table" (linhas de 70px em Surface Card, linha de 0,3px sob o cabeçalho). */
export function OrdersTable({ orders }: { orders: Order[] }) {
  const head = 'border-b-[0.3px] border-primary p-0 pb-3 text-left text-body-lg leading-4 font-bold text-foreground'
  return (
    <table className="-my-3 w-full table-fixed border-separate border-spacing-y-3">
      <caption className="sr-only">Seus pedidos</caption>
      <colgroup>
        <col />
        <col className="w-[170px]" />
        <col className="w-[110px]" />
        <col className="w-[170px]" />
        <col className="w-[190px]" />
        <col className="w-[150px]" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col" className={head}>Pedido</th>
          <th scope="col" className={head}>Data</th>
          <th scope="col" className={head}>Edições</th>
          <th scope="col" className={head}>Estado</th>
          <th scope="col" className={head}>Total</th>
          <th scope="col" className={head}>
            <span className="sr-only">Ações</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id} className="bg-card">
            <th scope="row" className="h-[70px] p-0 text-left font-normal">
              <div className="flex items-center gap-4 pr-4">
                <OrderThumb order={order} size={70} className="size-[70px] rounded-md" />
                <div className="flex min-w-0 flex-col gap-1.5 leading-4">
                  <span className="truncate text-body-lg font-bold text-foreground">{orderTitle(order)}</span>
                  <span className="text-body text-secondary">Pedido {orderRef(order.id)}</span>
                </div>
              </div>
            </th>
            <td className="p-0 text-body-lg leading-4 text-text-secondary">{formatReceiptDate(order.createdAt)}</td>
            <td className="p-0 text-body-lg leading-4 text-foreground">(x {orderEditionsCount(order)})</td>
            <td className="p-0">
              <OrderStatusBadge status={order.status} />
            </td>
            <td className="p-0 text-body-lg leading-4 font-bold whitespace-nowrap text-text-accent">
              {formatEthLabel(order.totals.totalWei)}
            </td>
            <td className="p-0 pr-6 text-right">
              <Link
                to="/pedidos/$orderId"
                params={{ orderId: order.id }}
                aria-label={`${actionLabel(order)}: pedido ${orderRef(order.id)}`}
                className={cn(buttonVariants({ variant: 'link', size: 'none' }), 'rounded-sm text-body-md')}
              >
                {actionLabel(order)}
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
