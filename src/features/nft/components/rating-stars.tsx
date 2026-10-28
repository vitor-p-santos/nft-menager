import starMuted from '@/assets/icons/star-muted.svg'
import star from '@/assets/icons/star.svg'
import { cn } from '@/lib/utils'

const MAX_STARS = 5

/** Cinco estrelas de 15px (Figma "Iconly/Bold/Star"): cheias em âmbar, vazias em Text/Secondary. */
export function RatingStars({ rating, className }: { rating: number; className?: string }) {
  const filled = Math.round(rating)
  return (
    <span className={cn('flex items-center gap-1', className)}>
      <span className="sr-only">Nota {rating.toLocaleString('pt-BR')} de {MAX_STARS}</span>
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <span key={i} aria-hidden className="flex size-[15px] items-center justify-center">
          <img src={i < filled ? star : starMuted} alt="" width={12.5} height={11.9} />
        </span>
      ))}
    </span>
  )
}
