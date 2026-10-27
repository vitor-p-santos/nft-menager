import { useQuery } from '@tanstack/react-query'
import { Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import arrowBack from '@/assets/icons/arrow-back.svg'
import shopIcon from '@/assets/icons/shop.svg'
import starSm from '@/assets/icons/star-sm.svg'
import { Skeleton } from '@/components/feedback/skeleton'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { Container } from '@/components/layout/container'
import { buttonVariants } from '@/components/ui/button-variants'
import { useAddToCart } from '@/entities/cart'
import { CATALOG_SECTION_ID } from '@/entities/catalog'
import type { Edition, Nft } from '@/entities/nft'
import { ApiError, toApiError } from '@/lib/api'
import { formatEthLabel } from '@/lib/money'
import { cn } from '@/lib/utils'
import { nftQueries } from '../api/queries'
import { EditionSelector } from './edition-selector'
import { FavoriteButton } from './favorite-button'
import { NftDescriptionTabs } from './nft-description-tabs'
import { NftGallery } from './nft-gallery'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { RatingStars } from './rating-stars'
import { RelatedNfts } from './related-nfts'
import { ShareNft } from './share-nft'

type CartFeedback = { tone: 'status' | 'error'; message: string } | null

/**
 * "Comprar" adiciona ao carrinho e abre a tela do carrinho (o checkout parte dele, Fase 5);
 * o botão de carrinho só adiciona e anuncia o resultado. Erros (ex.: 409 sem estoque) também.
 */
function useCartActions(nft: Nft, edition: Edition | null, quantity: number) {
  const add = useAddToCart()
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState<CartFeedback>(null)

  function addToCart(goToCart: boolean) {
    if (!edition || add.isPending) return
    setFeedback(null)
    add.mutate(
      { nftId: nft.id, edition, quantity },
      {
        onSuccess: () => {
          if (goToCart) void navigate({ to: '/carrinho' })
          else setFeedback({ tone: 'status', message: `${nft.name} foi adicionado ao carrinho.` })
        },
        onError: (error) =>
          setFeedback({ tone: 'error', message: `Não foi possível adicionar ao carrinho. ${toApiError(error).message}` }),
      },
    )
  }

  return { addToCart, isPending: add.isPending, feedback }
}

function CartFeedbackMessage({ feedback, className }: { feedback: CartFeedback; className?: string }) {
  return (
    <p
      aria-live="polite"
      className={cn('text-caption leading-4', feedback?.tone === 'error' ? 'text-destructive' : 'text-text-accent', className)}
    >
      {feedback?.message}
    </p>
  )
}

function BackToCatalog() {
  return (
    <Link to="/" hash={CATALOG_SECTION_ID} className={buttonVariants({ size: 'lg' })}>
      Voltar ao catálogo
    </Link>
  )
}

function Price({ nft, className }: { nft: Nft; className?: string }) {
  const hasDiscount = nft.compareAtPriceWei !== null && BigInt(nft.compareAtPriceWei) > BigInt(nft.priceWei)
  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-3 font-bold text-text-accent', className)}>
      <span>
        <span className="sr-only">Preço: </span>
        {formatEthLabel(nft.priceWei)}
      </span>
      {hasDiscount && nft.compareAtPriceWei && (
        <s className="text-body-md font-normal text-muted-foreground">
          <span className="sr-only">Preço anterior: </span>
          {formatEthLabel(nft.compareAtPriceWei)}
        </s>
      )}
    </p>
  )
}

/** Voltar (hero mobile): volta no histórico quando possível; senão, vai ao catálogo. */
function BackButton() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => (canGoBack ? router.history.back() : void router.navigate({ to: '/', hash: CATALOG_SECTION_ID }))}
      className="flex size-[35px] cursor-pointer items-center justify-center rounded-full border border-border bg-surface-raised"
    >
      <img src={arrowBack} alt="" width={13} height={7} className="rotate-90" />
    </button>
  )
}

function InfoLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-[1ch]">
      <dt>{label}:</dt>
      <dd>{children}</dd>
    </div>
  )
}

function NftDetailView({ nft }: { nft: Nft }) {
  const [edition, setEdition] = useState<Edition | null>(() => nft.editions.find((e) => e.available > 0)?.edition ?? null)
  const [quantity, setQuantity] = useState(1)
  const available = nft.editions.find((e) => e.edition === edition)?.available ?? 0
  // Limita também quando a disponibilidade muda após um refetch
  const qty = Math.min(Math.max(quantity, 1), Math.max(available, 1))
  const soldOut = available === 0
  const cart = useCartActions(nft, edition, qty)

  function changeEdition(next: Edition) {
    setEdition(next)
    const max = nft.editions.find((e) => e.edition === next)?.available ?? 1
    setQuantity((q) => Math.min(Math.max(q, 1), Math.max(max, 1)))
  }

  return (
    <article aria-labelledby="nft-titulo">
      <Container className="hidden pt-8 pb-3 md:block">
        <nav aria-label="Trilha de navegação">
          <ol className="flex gap-1 text-body-md leading-4 font-bold text-foreground">
            <li>
              <Link to="/" className="rounded-sm hover:text-text-accent">
                Início
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link to="/" hash={CATALOG_SECTION_ID} className="rounded-sm hover:text-text-accent">
                Mercado
              </Link>
            </li>
          </ol>
        </nav>
      </Container>

      <div className="mx-auto flex w-full max-w-[1248px] flex-col md:gap-8 md:px-6 xl:flex-row">
        <NftGallery
          images={nft.images}
          name={nft.name}
          mobileTopBar={
            <div className="flex items-center justify-between">
              <BackButton />
              <FavoriteButton nftId={nft.id} nftName={nft.name} variant="round" />
            </div>
          }
        />

        {/* Mobile: "Details Sheet" sobreposto à arte; desktop: coluna de detalhes */}
        <div className="relative -mt-[30px] flex flex-col gap-3 rounded-t-[31px] bg-card px-6 pt-8 pb-6 md:mt-0 md:rounded-none md:bg-transparent md:p-0 xl:min-h-[448px] xl:flex-1 xl:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 md:flex-col md:items-stretch">
              <h1 id="nft-titulo" className="text-title-sm leading-4 font-bold text-foreground md:text-heading-lg md:leading-normal">
                {nft.name}
              </h1>
              {/* Mobile: pílula de nota */}
              <p className="flex h-[27px] shrink-0 items-center gap-1.5 rounded-[32px] border border-primary px-1.5 text-body leading-4 md:hidden">
                <img src={starSm} alt="" width={11.7} height={11.1} />
                <span className="sr-only">Nota </span>
                <span className="font-medium text-foreground">{nft.rating.toLocaleString('pt-BR')}</span>
                <span className="text-muted-foreground">
                  ({nft.reviewsCount}
                  <span className="sr-only"> avaliações</span>)
                </span>
              </p>
              {/* Desktop: preço + estrelas */}
              <div className="hidden flex-wrap items-center justify-between gap-3 md:flex">
                <Price nft={nft} className="text-title leading-4" />
                <p className="flex items-center gap-1 text-body-md text-foreground">
                  <RatingStars rating={nft.rating} />
                  {nft.reviewsCount} avaliações de colecionadores
                </p>
              </div>
            </div>
            <hr className="hidden border-0 border-t-[0.3px] border-primary md:block" />
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="hidden text-body-md leading-4 font-bold text-foreground md:block">Sobre este NFT:</h2>
            <p className="text-body leading-6 text-muted-foreground">{nft.description}</p>
          </div>

          <EditionSelector editions={nft.editions} value={edition} onChange={changeEdition} />

          <div className="hidden flex-wrap items-center justify-between gap-4 md:flex">
            <QuantityStepper size="lg" value={qty} max={available} onChange={setQuantity} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={soldOut}
                aria-busy={cart.isPending}
                onClick={() => cart.addToCart(true)}
                className="h-10 w-[130px] cursor-pointer rounded-md bg-primary text-body leading-5 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-wait"
              >
                {soldOut ? 'ESGOTADO' : 'COMPRAR'}
              </button>
              <FavoriteButton nftId={nft.id} nftName={nft.name} variant="button" />
            </div>
            <CartFeedbackMessage feedback={cart.feedback} className="w-full empty:hidden" />
          </div>

          <div className="flex flex-col gap-3">
            <dl className="flex flex-col gap-3 text-body-md leading-normal text-secondary">
              <InfoLine label="ID do token">{nft.tokenId}</InfoLine>
              <InfoLine label="Coleção">{nft.collection}</InfoLine>
              {nft.attributes.length > 0 && <InfoLine label="Atributos">{nft.attributes.join(', ')}</InfoLine>}
            </dl>
            <ShareNft name={nft.name} />
          </div>
        </div>
      </div>

      <Container className="mt-12 md:mt-[100px]">
        <NftDescriptionTabs nft={nft} />
      </Container>

      <Container className="mt-16 md:mt-[100px]">
        <RelatedNfts nftId={nft.id} />
      </Container>

      {/* Mobile: "Buy Bar" fixa; o espaçador reserva a altura para não cobrir conteúdo */}
      <div aria-hidden className="h-[164px] md:hidden" />
      <section
        aria-label="Comprar"
        className="fixed inset-x-0 bottom-0 z-40 flex h-[164px] flex-col gap-5 rounded-t-[40px] bg-card px-6 pt-5 pb-9 shadow-buy-bar md:hidden"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-body-md leading-4 font-medium text-muted-foreground">
              Qtd.
            </span>
            <QuantityStepper size="sm" value={qty} max={available} onChange={setQuantity} />
          </div>
          <Price nft={nft} className="min-w-0 justify-end gap-y-1 text-right text-title-sm leading-4" />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={soldOut}
            aria-busy={cart.isPending}
            onClick={() => cart.addToCart(true)}
            className="h-[60px] w-[196px] cursor-pointer rounded-[40px] bg-[image:var(--gradient-cta)] text-body-lg leading-5 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-wait"
          >
            {soldOut ? 'Esgotado' : 'Comprar NFT'}
          </button>
          <button
            type="button"
            disabled={soldOut}
            aria-busy={cart.isPending}
            aria-label="Adicionar ao carrinho"
            onClick={() => cart.addToCart(false)}
            className="flex size-[60px] cursor-pointer items-center justify-center rounded-full border border-border bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-wait"
          >
            <img src={shopIcon} alt="" width={20} height={20} />
          </button>
        </div>
        {/* Mesma mensagem da área desktop: a Buy Bar tem altura fixa, então ela flutua acima */}
        <CartFeedbackMessage
          feedback={cart.feedback}
          className="absolute inset-x-6 -top-8 rounded-md bg-surface-raised px-3 py-2 empty:hidden"
        />
      </section>
    </article>
  )
}

/** Skeleton com a geometria da tela (hero + sheet no mobile; galeria + coluna no desktop). */
function NftDetailSkeleton() {
  return (
    <div aria-hidden>
      <Container className="hidden pt-8 pb-3 md:block">
        <Skeleton className="h-4 w-40" />
      </Container>
      <div className="mx-auto flex w-full max-w-[1248px] flex-col md:gap-8 md:px-6 xl:flex-row">
        <div className="bg-[image:var(--gradient-detail-hero)] px-6 pt-[23px] pb-[30px] md:hidden">
          <div className="flex justify-between">
            <Skeleton className="size-[35px] rounded-full" />
            <Skeleton className="size-[35px] rounded-full" />
          </div>
          <Skeleton className="mt-2 aspect-[361/356] w-full rounded-3xl" />
        </div>
        <div className="hidden w-full max-w-[573px] shrink-0 items-start gap-7 md:flex">
          <div className="flex w-[100px] shrink-0 flex-col gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="size-[100px] rounded-lg" />
            ))}
          </div>
          <div className="aspect-square min-w-0 flex-1 rounded-md bg-card p-4">
            <Skeleton className="aspect-square w-full rounded-3xl" />
          </div>
        </div>
        <div className="relative -mt-[30px] flex flex-col gap-5 rounded-t-[31px] bg-card px-6 pt-8 pb-6 md:mt-0 md:rounded-none md:bg-transparent md:p-0 xl:min-h-[448px] xl:flex-1 xl:justify-between">
          <Skeleton className="h-6 w-2/3 md:h-9" />
          <Skeleton className="hidden h-6 w-1/3 md:block" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-7 w-52" />
          <Skeleton className="hidden h-12 w-full md:block" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Tela "Detalhes do NFT" (Figma desktop `10:244`, mobile `15:5536`) com skeleton, erro e 404. */
export function NftDetail({ nftId }: { nftId: string }) {
  const { data: nft, error, isError, refetch } = useQuery(nftQueries.detail(nftId))

  if (nft) return <NftDetailView key={nft.id} nft={nft} />

  if (isError && error instanceof ApiError && error.kind === 'not_found') {
    return (
      <Container className="py-10 md:py-16">
        <EmptyState
          title="NFT não encontrado"
          description="Ele pode ter sido removido ou o link está incorreto."
          action={<BackToCatalog />}
        />
      </Container>
    )
  }
  if (isError) {
    return (
      <Container className="py-10 md:py-16">
        <ErrorState
          title="Não foi possível carregar este NFT"
          description="Verifique sua conexão e tente novamente."
          action={{ label: 'Tentar novamente', onClick: () => void refetch() }}
        />
      </Container>
    )
  }
  return <NftDetailSkeleton />
}
