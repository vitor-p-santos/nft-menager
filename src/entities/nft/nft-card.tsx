import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/feedback/skeleton'
import type { NftSummary } from './schema'
import { formatEthLabel } from '@/lib/money'
import { cn } from '@/lib/utils'
import { ResponsiveImage } from '@/components/ui/responsive-image'

/**
 * Card do catálogo (Figma "Products" / Mobile "Grid").
 * Desktop: fundo 258×300 com arte 250×250 (raio 15). Mobile: fundo com raio 20 e arte inset de 4px.
 * O card inteiro é um link (nome = rótulo acessível). Fica em entities porque catálogo e detalhe
 * ("Mais desta coleção") o usam; a ação sobre a arte (favoritar) chega pelo slot `action`,
 * composto na rota, para que nenhuma feature importe outra.
 */
export function NftCard({ nft, priority = false, action }: { nft: NftSummary; priority?: boolean; action?: ReactNode }) {
  const hasDiscount = nft.compareAtPriceWei !== null && BigInt(nft.compareAtPriceWei) > BigInt(nft.priceWei)

  return (
    <article className="group relative flex flex-col">
      <div className="flex aspect-[175/200] items-start justify-center overflow-hidden rounded-2xl bg-card px-1 pt-3 md:aspect-[258/300] md:items-center md:rounded-none md:pt-0">
        <div className="relative w-full">
          <ResponsiveImage
            src={nft.image.src}
            sizes="(min-width: 1280px) 260px, (min-width: 768px) 30vw, 50vw"
            alt=""
            width={nft.image.width}
            height={nft.image.height}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className="aspect-square w-full rounded-xl object-cover transition-transform duration-300 motion-safe:group-focus-within:scale-[1.03] motion-safe:group-hover:scale-[1.03]"
          />
          {nft.rarity === 'rare' && (
            <span className="absolute top-0 -left-1 flex h-8 w-[68px] items-center bg-primary px-2 text-caption leading-[14px] font-bold text-primary-foreground">
              RARO
            </span>
          )}
          {/* Ação de hover/foco (desktop): atalho visual para o detalhe; o link real é o nome */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto hidden w-max rounded-md bg-primary px-3 py-2 text-body leading-4 font-bold text-primary-foreground opacity-0 transition-opacity md:block md:group-focus-within:opacity-100 md:group-hover:opacity-100"
          >
            Ver detalhes
          </span>
          {action && (
            <div className="absolute top-1.5 right-1.5 z-10 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100 md:has-[[aria-pressed=true]]:opacity-100">
              {action}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-0.5 px-2 pt-4 md:gap-1.5 md:px-0 md:pt-5">
        <h3 className="truncate text-body-md leading-5 text-foreground">
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:after:outline-2 group-focus-within:after:outline-offset-4 group-focus-within:after:outline-ring md:after:rounded-none after:rounded-2xl"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-3 text-body-md leading-5 md:text-body-xl">
          <span className="font-bold text-text-accent">
            <span className="sr-only">Preço: </span>
            {formatEthLabel(nft.priceWei)}
          </span>
          {hasDiscount && nft.compareAtPriceWei && (
            <s className="text-muted-foreground">
              <span className="sr-only">Preço anterior: </span>
              {formatEthLabel(nft.compareAtPriceWei)}
            </s>
          )}
        </p>
      </div>
    </article>
  )
}

/** Skeleton com a geometria exata do card (D-04). */
export function NftCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex aspect-[175/200] items-start justify-center rounded-2xl bg-card px-1 pt-3 md:aspect-[258/300] md:items-center md:rounded-none md:pt-0">
        <Skeleton className="aspect-square w-full rounded-xl" />
      </div>
      {/* Mesma geometria do bloco de texto do card: linhas de 20px (leading-5), gap e padding iguais */}
      <div className="flex flex-col gap-0.5 px-2 pt-4 md:gap-1.5 md:px-0 md:pt-5">
        <div className="flex h-5 items-center">
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex h-5 items-center">
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    </div>
  )
}
