import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/feedback/skeleton'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { SessionExpiredState } from '@/components/feedback/session-expired-state'
import { Container } from '@/components/layout/container'
import { buttonVariants } from '@/components/ui/button-variants'
import { NETWORK_LABELS } from '@/entities/nft'
import { rejectionTitle, type Order } from '@/entities/order'
import { formatReceiptDate, orderEditionsCount } from '@/entities/order/format'
import { OrderReceipt } from '@/entities/order/order-receipt'
import {
  MyOrdersLink,
  ORDER_STATUS_TITLE_CLASS,
  OrderStatusMessage,
  RejectedOrderActions,
  ThankYouArt,
} from '@/entities/order/order-status-panel'
import { ApiError, isUnauthorizedError } from '@/lib/api'
import { formatEthLabel } from '@/lib/money'
import { cn } from '@/lib/utils'
import { orderReceiptQuery, useOrderDetail } from '../api'
import { ORDER_STATUS_LABELS } from './order-labels'
import { OrdersHeading } from './orders-heading'

/**
 * Cartão do recibo: o Order Confirmation Modal (`70376:239`) fora do diálogo. No desktop, 578px em
 * Surface Card com a faixa âmbar de 10px; no mobile ocupa a largura toda (D-02).
 */
function ReceiptCard({ children, busy, labelled = true }: { children: ReactNode; busy?: boolean; labelled?: boolean }) {
  return (
    <section
      aria-labelledby={labelled ? TITLE_ID : undefined}
      aria-busy={busy}
      className="-mx-6 flex flex-col bg-surface-card pt-[22px] pb-8 md:mx-auto md:w-[578px] md:border-b-[10px] md:border-primary md:pb-12"
    >
      {children}
    </section>
  )
}

const TITLE_ID = 'pedido-titulo'

const titleClass = cn('px-6 text-center', ORDER_STATUS_TITLE_CLASS)

/** Recibo imutável (`GET /orders/:id/receipt`): o snapshot gravado na confirmação, nunca o pedido vivo. */
function ConfirmedOrder({ orderId }: { orderId: string }) {
  const receipt = useQuery(orderReceiptQuery(orderId))

  return (
    <ReceiptCard busy={receipt.isPending}>
      <ThankYouArt />
      <h2 id={TITLE_ID} className={cn(titleClass, 'mt-[18px] mb-[22px]')}>
        Seus NFTs agora estão na sua carteira
      </h2>
      {receipt.data ? (
        <OrderReceipt order={receipt.data.snapshot} />
      ) : receipt.isError ? (
        <ErrorState
          className="py-8"
          title="Não foi possível carregar o recibo"
          description="O pedido está confirmado. Verifique sua conexão e tente novamente."
          action={{ label: 'Tentar novamente', onClick: () => void receipt.refetch() }}
        />
      ) : (
        <ReceiptSkeleton />
      )}
      <MyOrdersLink className="mt-6 self-center" />
    </ReceiptCard>
  )
}

/** Pendente (D-03): o layout do recibo com o ícone de progresso; o `order.updated` (ou o polling) atualiza. */
function PendingOrder({ order }: { order: Order }) {
  return (
    <ReceiptCard busy>
      <OrderStatusMessage status="pending" className="pb-2">
        <h2 id={TITLE_ID} className={titleClass}>
          Aguardando a confirmação da rede
        </h2>
        <p className="text-body leading-[22px] text-text-secondary">
          O pagamento de {formatEthLabel(order.totals.totalWei)} está sendo processado na {NETWORK_LABELS[order.network]}.
          Esta página se atualiza sozinha quando a rede responder.
        </p>
        <OrderFacts order={order} />
        <MyOrdersLink />
      </OrderStatusMessage>
    </ReceiptCard>
  )
}

/** Recusado (D-03): mesmo layout, ícone de alerta e o motivo devolvido pela API. */
function RejectedOrder({ order }: { order: Order }) {
  return (
    <ReceiptCard>
      <OrderStatusMessage status="rejected" className="pb-2">
        <h2 id={TITLE_ID} className={titleClass}>
          {rejectionTitle(order)}
        </h2>
        <p className="text-body leading-[22px] text-text-secondary">
          {order.rejectionReason ?? 'A compra não foi concluída.'} Nenhum valor foi cobrado.
        </p>
        <OrderFacts order={order} />
        {/* Mesmas ações do aviso de recusa do checkout: o carrinho continua intacto e o checkout revalida tudo */}
        <RejectedOrderActions
          retry={
            <Link to="/checkout" className={buttonVariants({ size: 'lg' })}>
              Tentar novamente
            </Link>
          }
        >
          <MyOrdersLink />
        </RejectedOrderActions>
      </OrderStatusMessage>
    </ReceiptCard>
  )
}

/** Resumo do pedido não confirmado (sem recibo): data, itens e total, entre as linhas âmbar do recibo. */
function OrderFacts({ order }: { order: Order }) {
  return (
    <dl className="-mx-6 grid w-[calc(100%+3rem)] grid-cols-3 border-y border-primary px-6 py-4 text-left text-body leading-[19px] text-text-secondary md:-mx-14 md:w-[calc(100%+7rem)] md:px-9">
      <div className="flex flex-col gap-0.5">
        <dt className="font-bold">Data</dt>
        <dd>{formatReceiptDate(order.createdAt)}</dd>
      </div>
      <div className="flex flex-col gap-0.5 border-l border-primary pl-4">
        <dt className="font-bold">Edições</dt>
        <dd>{orderEditionsCount(order)}</dd>
      </div>
      <div className="flex flex-col gap-0.5 border-l border-primary pl-4">
        <dt className="font-bold">Total</dt>
        <dd className="truncate">{formatEthLabel(order.totals.totalWei)}</dd>
      </div>
    </dl>
  )
}

/** Geometria do recibo: faixa de 4 colunas, título, 2 linhas de item e totais. */
function ReceiptSkeleton() {
  return (
    <div aria-hidden className="flex flex-col">
      <div className="grid grid-cols-2 gap-3 border-y border-primary px-6 py-4 md:grid-cols-4 md:px-9">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 px-6 pt-7 md:px-11">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-4 w-full" />
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-[52px] shrink-0 md:size-[70px]" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
        <Skeleton className="mt-2 ml-auto h-4 w-48" />
        <Skeleton className="ml-auto h-4 w-48" />
      </div>
    </div>
  )
}

function OrderSkeleton() {
  return (
    <ReceiptCard busy labelled={false}>
      <Skeleton className="mx-auto h-[84px] w-[68px]" />
      <Skeleton className="mx-auto mt-[18px] mb-[22px] h-5 w-72 max-w-[80%]" />
      <ReceiptSkeleton />
    </ReceiptCard>
  )
}

/**
 * Página do pedido (`/pedidos/$orderId`, T-081). Confirmado: recibo imutável; pendente: aguarda a
 * rede pelo evento `order.updated`, com polling de reserva (`useOrderDetail`, que invalida as listas
 * ao sair de `pending`); recusado: motivo, "Tentar novamente" (checkout) e volta ao carrinho, que continua
 * intacto. A troca de estado é anunciada num `aria-live`.
 */
export function OrderPage({ orderId }: { orderId: string }) {
  const order = useOrderDetail(orderId)

  let content: ReactNode
  if (order.data) {
    content = {
      confirmed: <ConfirmedOrder orderId={orderId} />,
      pending: <PendingOrder order={order.data} />,
      rejected: <RejectedOrder order={order.data} />,
    }[order.data.status]
  } else if (order.error instanceof ApiError && order.error.kind === 'not_found') {
    content = (
      <EmptyState
        title="Pedido não encontrado"
        description="O pedido não existe ou pertence a outra conta."
        action={
          <Link to="/atividade" className={buttonVariants({ size: 'lg' })}>
            Ver meus pedidos
          </Link>
        }
      />
    )
  } else if (isUnauthorizedError(order.error)) {
    content = <SessionExpiredState description="Entre novamente para ver o pedido." />
  } else if (order.isError) {
    content = (
      <ErrorState
        title="Não foi possível carregar o pedido"
        description="Verifique sua conexão e tente novamente."
        action={{ label: 'Tentar novamente', onClick: () => void order.refetch() }}
      />
    )
  } else {
    content = <OrderSkeleton />
  }

  return (
    <Container className="flex flex-col gap-8 pt-[30px] md:gap-[38px] md:pt-0">
      <OrdersHeading title="Pedido" order />
      <p aria-live="polite" className="sr-only">
        {order.data ? `Pedido ${ORDER_STATUS_LABELS[order.data.status].toLowerCase()}` : ''}
      </p>
      {content}
    </Container>
  )
}
