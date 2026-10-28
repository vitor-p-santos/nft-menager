import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/feedback/skeleton'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { Container } from '@/components/layout/container'
import { buttonVariants } from '@/components/ui/button-variants'
import { Pagination } from '@/components/ui/pagination'
import { ExploreLink } from '@/entities/catalog/explore-link'
import { ORDER_STATUSES, type OrderList } from '@/entities/order'
import { cn } from '@/lib/utils'
import { orderListQuery } from '../api'
import type { ActivitySearch } from '../schemas/activity-search'
import { ORDER_FILTER_LABELS, ORDER_STATUS_LABELS } from './order-labels'
import { OrdersCards } from './orders-cards'
import { OrdersHeading } from './orders-heading'
import { OrdersTable } from './orders-table'

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
 * Enquanto houver pedido recém-criado `pending`, a lista acompanha o `order.updated` e faz polling de
 * reserva (`orderListQuery`).
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
