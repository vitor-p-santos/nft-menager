import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/feedback/skeleton'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { Container } from '@/components/layout/container'
import { buttonVariants } from '@/components/ui/button-variants'
import { Pagination } from '@/components/ui/pagination'
import { ResponsiveImage } from '@/components/ui/responsive-image'
import { CATALOG_SECTION_ID } from '@/entities/catalog'
import { ORDER_STATUSES, type Order, type OrderList } from '@/entities/order'
import { formatReceiptDate } from '@/entities/order/format'
import { formatEthLabel } from '@/lib/money'
import { cn } from '@/lib/utils'
import { orderListQuery } from '../api'
import type { ActivitySearch } from '../schemas/activity-search'
import { ORDER_FILTER_LABELS, ORDER_STATUS_LABELS } from './order-labels'
import { OrderStatusBadge } from './order-status'
import { OrdersHeading } from './orders-heading'

/** Referência curta do pedido ("#A91FE82C"): os 8 últimos caracteres do id, em maiúsculas. */
function orderRef(id: string) {
  return `#${id.replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase()}`
}

/** "Emerald Ape #042" ou "Emerald Ape #042 + 2 NFTs". */
function orderTitle(order: Order) {
  const [first] = order.items
  const others = order.items.length - 1
  return others > 0 ? `${first?.nft.name ?? ''} + ${others} ${others === 1 ? 'NFT' : 'NFTs'}` : (first?.nft.name ?? '')
}

function editionsCount(order: Order) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

/** Ação de cada pedido: o recibo quando confirmado; senão, a página com o estado atual. */
function actionLabel(order: Order) {
  return order.status === 'confirmed' ? 'Ver recibo' : 'Ver pedido'
}

/**
 * Filtro de estado: links (o estado vive na URL), no padrão das abas do catálogo. As contagens vêm
 * da API (`counts`, independentes do filtro) e só aparecem depois da primeira resposta.
 */
function StatusFilter({ current, counts }: { current: ActivitySearch['status']; counts?: OrderList['counts'] }) {
  const options = ['all', ...ORDER_STATUSES] as const
  return (
    <nav aria-label="Filtrar pedidos por estado" className="-mx-1 overflow-x-auto px-1">
      <ul className="flex items-start gap-4 whitespace-nowrap md:gap-5">
        {options.map((option) => {
          const status = option === 'all' ? undefined : option
          const active = status === current
          return (
            <li key={option}>
              <Link
                to="/atividade"
                search={status ? { status } : {}}
                resetScroll={false}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col gap-1 rounded-sm pt-0.5 text-body leading-5 transition-colors hover:text-text-accent md:text-body-md',
                  active ? 'font-bold text-text-accent' : 'text-foreground md:font-bold',
                )}
              >
                <span>
                  {ORDER_FILTER_LABELS[option]}
                  {/* Abaixo de md as contagens saem para as 4 abas caberem em 390px; o total fica no contador ao lado */}
                  {counts && <span className="font-normal text-text-secondary max-md:sr-only"> ({counts[option]})</span>}
                </span>
                <span aria-hidden className={cn('h-0.5 w-full bg-primary', !active && 'invisible')} />
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function OrderThumb({ order, size, className }: { order: Order; size: number; className?: string }) {
  const image = order.items[0]?.nft.image
  return image ? (
    <ResponsiveImage src={image.src} sizes={`${size}px`} alt="" width={size} height={size} loading="lazy" className={cn('shrink-0 object-cover', className)} />
  ) : (
    <span aria-hidden style={{ width: size, height: size }} className={cn('shrink-0 bg-muted', className)} />
  )
}

/** Desktop (xl): tabela no padrão "Cart Table" (linhas de 70px em Surface Card, linha de 0,3px sob o cabeçalho). */
function OrdersTable({ orders }: { orders: Order[] }) {
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
            <td className="p-0 text-body-lg leading-4 text-foreground">(x {editionsCount(order)})</td>
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

/**
 * Mobile e tablet: cards no padrão "Cart Items" mobile (100px, raio 14, sombra do card do
 * carrinho). O card inteiro é clicável pelo link do título (área estendida com `after:`).
 */
function OrdersCards({ orders }: { orders: Order[] }) {
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

/** Skeleton com a geometria dos cards (mobile/tablet) e das linhas (desktop). */
function OrdersSkeleton() {
  return (
    <div aria-hidden>
      <div className="grid gap-5 md:grid-cols-2 xl:hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex h-[100px] gap-[9px] rounded-[14px] bg-card">
            <Skeleton className="size-[100px] rounded-[14px]" />
            <div className="flex flex-1 flex-col gap-2 py-[13px] pr-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-auto h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden flex-col gap-3 xl:flex">
        <Skeleton className="h-4 w-full" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex h-[70px] items-center gap-4 bg-card pr-6">
            <Skeleton className="size-[70px] rounded-md" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="ml-auto h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ExploreLink() {
  return (
    <Link to="/" hash={CATALOG_SECTION_ID} className={buttonVariants({ size: 'lg' })}>
      Explorar o mercado
    </Link>
  )
}

function OrdersEmpty({ search, list }: { search: ActivitySearch; list: OrderList }) {
  if (list.total > 0) {
    // Página fora do intervalo (URL editada ou pedidos que mudaram de estado)
    return (
      <EmptyState
        title="Esta página não tem pedidos"
        description="Volte para a primeira página da lista."
        action={
          <Link to="/atividade" search={{ status: search.status }} className={buttonVariants({ size: 'lg' })}>
            Ir para a primeira página
          </Link>
        }
      />
    )
  }
  if (search.status) {
    return (
      <EmptyState
        title={`Nenhum pedido ${ORDER_STATUS_LABELS[search.status].toLowerCase()}`}
        description="Os pedidos com esse estado aparecem aqui."
        action={
          <Link to="/atividade" className={buttonVariants({ size: 'lg' })}>
            Ver todos os pedidos
          </Link>
        }
      />
    )
  }
  return (
    <EmptyState
      title="Você ainda não fez pedidos"
      description="Quando você comprar um NFT, o pedido e o recibo aparecem aqui."
      action={<ExploreLink />}
    />
  )
}

/**
 * "Atividade" (`/atividade`, T-082; D-03/D-06): pedidos do usuário logado, do mais recente para o
 * mais antigo, com filtro de estado e paginação na URL. Sem frame no Figma: segue o carrinho
 * (tabela no desktop, cards no mobile) e as abas do catálogo (ARCHITECTURE.md → Pedidos: telas).
 * Enquanto houver pedido recém-criado `pending`, a lista faz polling (`orderListQuery`, até a Fase 8).
 */
export function ActivityPage({ search }: { search: ActivitySearch }) {
  const navigate = useNavigate({ from: '/atividade' })
  const query = useQuery(orderListQuery(search))
  const list = query.data

  let content: ReactNode
  if (list) {
    content =
      list.items.length === 0 ? (
        <OrdersEmpty search={search} list={list} />
      ) : (
        <div aria-busy={query.isPlaceholderData} className={cn('flex flex-col gap-8 transition-opacity', query.isPlaceholderData && 'opacity-60')}>
          <div className="xl:hidden">
            <OrdersCards orders={list.items} />
          </div>
          <div className="hidden xl:block">
            <OrdersTable orders={list.items} />
          </div>
          <Pagination
            label="Paginação dos pedidos"
            page={list.page}
            totalPages={list.totalPages}
            onPageChange={(page) => void navigate({ search: (prev) => ({ ...prev, page: page === 1 ? undefined : page }) })}
          />
        </div>
      )
  } else if (query.isError) {
    content = (
      <ErrorState
        title="Não foi possível carregar seus pedidos"
        description="Verifique sua conexão e tente novamente."
        action={{ label: 'Tentar novamente', onClick: () => void query.refetch() }}
      />
    )
  } else {
    content = <OrdersSkeleton />
  }

  return (
    <Container className="flex flex-col gap-5 pt-[30px] md:gap-8 md:pt-0">
      <OrdersHeading title="Atividade" />
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <StatusFilter current={search.status} counts={list?.counts} />
        <p aria-live="polite" className="text-body leading-5 text-text-secondary">
          {list && !query.isPlaceholderData ? `${list.total} ${list.total === 1 ? 'pedido' : 'pedidos'}` : ''}
        </p>
      </div>
      {content}
    </Container>
  )
}
