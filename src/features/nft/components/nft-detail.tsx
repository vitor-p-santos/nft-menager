import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import starSm from '@/assets/icons/star-sm.svg'
import { Skeleton } from '@/components/feedback/skeleton'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { BackButton } from '@/components/layout/back-button'
import { Container } from '@/components/layout/container'
import { Breadcrumbs } from '@/components/layout/page-heading'
import { CATALOG_SECTION_ID } from '@/entities/catalog'
import { ExploreLink } from '@/entities/catalog/explore-link'
import type { Nft } from '@/entities/nft'
import { ApiError } from '@/lib/api'
import { nftQueries } from '../api/queries'
import { useNftPurchase } from '../hooks/use-nft-purchase'
import { BuyBar } from './buy-bar'
import { EditionSelector } from './edition-selector'
import { FavoriteButton } from './favorite-button'
import { NftDescriptionTabs } from './nft-description-tabs'
import { NftGallery } from './nft-gallery'
import { NftPrice } from './nft-price'
import { PurchasePanel } from './purchase-panel'
import { RatingStars } from './rating-stars'
import { RelatedNfts } from './related-nfts'
import { ShareNft } from './share-nft'

function InfoLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-[1ch]">
      <dt>{label}:</dt>
      <dd>{children}</dd>
    </div>
  )
}

function NftDetailView({ nft }: { nft: Nft }) {
  const purchase = useNftPurchase(nft)

  return (
    <article aria-labelledby="nft-titulo">
      <Container className="hidden pt-8 pb-3 md:block">
        <Breadcrumbs
          items={[
            { label: 'Início', to: '/' },
            { label: 'Mercado', to: '/', hash: CATALOG_SECTION_ID },
          ]}
        />
      </Container>

      <div className="mx-auto flex w-full max-w-[1248px] flex-col md:gap-8 md:px-6 xl:flex-row">
        <NftGallery
          images={nft.images}
          name={nft.name}
          mobileTopBar={
            <div className="flex items-center justify-between">
              <BackButton fallback={{ to: '/', hash: CATALOG_SECTION_ID }} />
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
                <NftPrice nft={nft} className="text-title leading-4" />
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

          <EditionSelector editions={nft.editions} value={purchase.edition} onChange={purchase.changeEdition} />

          <PurchasePanel nft={nft} purchase={purchase} />

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

      <BuyBar nft={nft} purchase={purchase} />
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
          action={<ExploreLink>Voltar ao catálogo</ExploreLink>}
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
