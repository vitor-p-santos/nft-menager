import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { LiveMessage } from '@/components/feedback/live-message'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { Container } from '@/components/layout/container'
import { Breadcrumbs, PageHeading, type Crumb } from '@/components/layout/page-heading'
import { CATALOG_SECTION_ID } from '@/entities/catalog'
import { ExploreLink } from '@/entities/catalog/explore-link'
import { cn } from '@/lib/utils'
import { cartQueries } from '../api/queries'
import { useCartItemActions } from '../hooks/use-cart-item-actions'
import type { Cart } from '../schemas/cart'
import { CartCards, CartItemsSkeleton, CartTable } from './cart-items'
import { CartSummary, CartSummarySkeleton } from './cart-summary'

const MARKET_TRAIL: Crumb[] = [
  { label: 'Início', to: '/' },
  { label: 'Mercado', to: '/', hash: CATALOG_SECTION_ID },
  { label: 'Carrinho' },
]

function Heading() {
  return (
    <>
      <Breadcrumbs items={MARKET_TRAIL} className="hidden pt-8 md:block" />
      {/* Mobile (Figma "Carrinho de NFTs"): voltar + título centralizado */}
      <PageHeading title="Carrinho de NFTs" fallback={{ to: '/', hash: CATALOG_SECTION_ID }} />
    </>
  )
}

function CartContent({ cart, related }: { cart: Cart; related?: ReactNode }) {
  const actions = useCartItemActions()
  const feedback = actions.feedback

  return (
    <>
      <LiveMessage feedback={feedback} className={cn('text-body leading-5', !feedback && 'sr-only')} />
      {cart.items.length === 0 ? (
        <EmptyState
          title="Seu carrinho está vazio"
          description="Explore o mercado e adicione NFTs para vê-los aqui."
          action={<ExploreLink />}
        />
      ) : (
        <div className="flex flex-col gap-8 max-md:flex-1 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="xl:hidden">
              <CartCards items={cart.items} actions={actions} />
            </div>
            <div className="hidden xl:block">
              <CartTable items={cart.items} actions={actions} />
            </div>
          </div>
          <CartSummary cart={cart} />
        </div>
      )}
      {cart.items.length > 0 && related && <div className="mt-16 hidden md:block xl:mt-[100px]">{related}</div>}
    </>
  )
}

/**
 * Tela "Carrinho" (Figma desktop `11:1278`, mobile `16:360`). `related` é composto pela rota
 * ("Colecionadores também viram") para que esta feature não importe a de NFT.
 */
export function CartPage({ related }: { related?: (cart: Cart) => ReactNode }) {
  const { data: cart, isError, refetch } = useQuery(cartQueries.get())

  let content: ReactNode
  if (cart) {
    content = <CartContent cart={cart} related={related?.(cart)} />
  } else if (isError) {
    content = (
      <ErrorState
        title="Não foi possível carregar o carrinho"
        description="Verifique sua conexão e tente novamente."
        action={{ label: 'Tentar novamente', onClick: () => void refetch() }}
      />
    )
  } else {
    content = (
      <div className="flex flex-col gap-8 xl:flex-row xl:justify-between">
        <CartItemsSkeleton />
        <CartSummarySkeleton />
      </div>
    )
  }

  // min-h-dvh em todos os breakpoints: o skeleton (carrinho cheio) é mais alto que o estado vazio;
  // sem a reserva, o rodapé sobe para dentro da viewport quando o carrinho chega vazio (CLS 0,17 no desktop)
  return (
    <Container className="flex min-h-dvh flex-col gap-5 pt-[30px] md:gap-3 md:pt-0">
      <Heading />
      {content}
    </Container>
  )
}
