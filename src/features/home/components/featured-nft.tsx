import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/feedback/skeleton'
import { cn } from '@/lib/utils'
import type { HomeContent } from '../schemas/content'
import { ResponsiveImage } from '@/components/ui/responsive-image'

/** Banner "NFT em destaque" (Figma: abaixo dos filtros, 310 de largura, arte com raio 24). */
export function FeaturedNft({ featured, className }: { featured: HomeContent['featured']; className?: string }) {
  const { nft } = featured
  return (
    <section aria-labelledby="destaque-titulo" className={cn('relative flex flex-col overflow-hidden rounded-b-3xl bg-card', className)}>
      <div className="flex flex-col gap-3 px-5 pt-6 pb-3">
        <h2 id="destaque-titulo" className="text-heading leading-8 font-bold text-text-accent">
          {featured.title}
        </h2>
        <p className="text-center text-lead leading-6 font-bold text-foreground">{featured.subtitle}</p>
      </div>
      <Link
        to="/nft/$nftId"
        params={{ nftId: nft.id }}
        aria-label={`${nft.name}: ver detalhes do NFT em destaque`}
        className="group block overflow-hidden rounded-3xl"
      >
        <ResponsiveImage
          src={nft.image.src}
          sizes="(min-width: 768px) 310px, 100vw"
          alt={nft.image.alt}
          width={310}
          height={366}
          loading="lazy"
          className="aspect-[310/366] w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03] motion-safe:group-focus-visible:scale-[1.03]"
        />
      </Link>
    </section>
  )
}

export function FeaturedNftSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('flex flex-col gap-3 bg-card pt-6', className)}>
      <Skeleton className="mx-5 h-7 w-48" />
      <Skeleton className="mx-auto h-5 w-40" />
      <Skeleton className="mt-3 aspect-[310/366] w-full rounded-3xl" />
    </div>
  )
}
