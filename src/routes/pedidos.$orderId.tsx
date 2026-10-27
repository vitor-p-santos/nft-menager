import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth/auth-route'
import { orderDetailQuery } from '@/features/orders/api'
import { OrderPage } from '@/features/orders/components/order-page'

export const Route = createFileRoute('/pedidos/$orderId')({
  // Rota privada: sem sessão vai para /entrar?redirect=/pedidos/<id> e volta para o recibo
  beforeLoad: requireAuth,
  loader: ({ context: { queryClient }, params }) => {
    void queryClient.ensureQueryData(orderDetailQuery(params.orderId)).catch(() => undefined)
  },
  component: PedidoRoute,
})

function PedidoRoute() {
  const { orderId } = Route.useParams()
  // `key`: trocar de pedido remonta a página (sem herdar estado do anterior)
  return <OrderPage key={orderId} orderId={orderId} />
}
