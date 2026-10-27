import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Skeleton } from '@/components/feedback/skeleton'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { Button } from '@/components/ui/button'
import { nftQueries } from '../api/queries'
import { REVIEWS_PAGE_SIZE } from '../schemas/review'
import { RatingStars } from './rating-stars'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' })

function ReviewsSkeleton() {
  return (
    <ul aria-hidden className="flex flex-col divide-y divide-border">
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="flex flex-col gap-2 py-4">
          <div className="flex h-6 items-center gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </li>
      ))}
    </ul>
  )
}

/** Avaliações paginadas (GET /nfts/:id/reviews), da mais recente para a mais antiga. */
export function NftReviews({ nftId }: { nftId: string }) {
  const [page, setPage] = useState(1)
  const query = useQuery({ ...nftQueries.reviews(nftId, page), placeholderData: keepPreviousData })
  const data = query.data

  if (query.isError && !data) {
    return (
      <ErrorState
        title="Não foi possível carregar as avaliações"
        description="Verifique sua conexão e tente novamente."
        action={{ label: 'Tentar novamente', onClick: () => void query.refetch() }}
      />
    )
  }
  if (!data) return <ReviewsSkeleton />
  if (data.total === 0) return <EmptyState title="Ainda não há avaliações" description="Este NFT ainda não foi avaliado por colecionadores." />

  const totalPages = Math.max(1, Math.ceil(data.total / (data.pageSize || REVIEWS_PAGE_SIZE)))

  return (
    <div className="flex flex-col gap-4">
      <ul aria-busy={query.isFetching} className="flex flex-col divide-y divide-border transition-opacity aria-busy:opacity-70">
        {data.items.map((review) => (
          <li key={review.id} className="flex flex-col gap-2 py-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-body leading-6 font-bold text-foreground">{review.author}</p>
              <RatingStars rating={review.rating} />
              <time dateTime={review.createdAt} className="text-caption-lg leading-[22px] text-muted-foreground">
                {dateFormat.format(new Date(review.createdAt))}
              </time>
            </div>
            <p className="text-body leading-6 text-muted-foreground">{review.body}</p>
          </li>
        ))}
      </ul>
      {totalPages > 1 && (
        <nav aria-label="Páginas de avaliações" className="flex items-center justify-between gap-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anteriores
          </Button>
          <output aria-live="polite" className="text-body leading-6 text-muted-foreground">
            Página {data.page} de {totalPages}
          </output>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Próximas
          </Button>
        </nav>
      )}
    </div>
  )
}
