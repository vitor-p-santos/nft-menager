import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/feedback/skeleton'
import { ErrorState } from '@/components/feedback/states'
import { Container } from '@/components/layout/container'
import { homeQueries } from '../api/queries'
import { BlogSection } from './blog-section'
import { FeaturedNft, FeaturedNftSkeleton } from './featured-nft'
import { HeroCarousel, HeroSkeleton } from './hero-carousel'
import { Promos } from './promos'

/*
 * Seções editoriais da Home. Todas leem a mesma query (`GET /content/home`), então o
 * carregamento acontece uma única vez e cada seção decide seu skeleton/erro.
 */

export function HomeHero() {
  const { data, isError, refetch } = useQuery(homeQueries.content())
  if (data) return <HeroCarousel slides={data.hero} />
  if (isError) {
    return (
      <Container>
        <ErrorState
          title="Não foi possível carregar os destaques"
          action={{ label: 'Tentar novamente', onClick: () => void refetch() }}
          className="py-8"
        />
      </Container>
    )
  }
  return <HeroSkeleton />
}

export function HomeFeatured({ className }: { className?: string }) {
  const { data, isError } = useQuery(homeQueries.content())
  if (data) return <FeaturedNft featured={data.featured} className={className} />
  // O erro já é anunciado pelo hero; aqui o espaço simplesmente não é ocupado
  if (isError) return null
  return <FeaturedNftSkeleton className={className} />
}

export function HomeEditorial() {
  const { data, isError } = useQuery(homeQueries.content())
  if (data) {
    return (
      <>
        <Promos promos={data.promos} />
        <BlogSection posts={data.posts} />
      </>
    )
  }
  if (isError) return null
  return (
    <Container aria-hidden className="mt-16 xl:mt-24">
      <div className="grid gap-6 xl:grid-cols-2 xl:gap-[30px]">
        <Skeleton className="h-[250px] rounded-lg" />
        <Skeleton className="h-[250px] rounded-lg" />
      </div>
    </Container>
  )
}
