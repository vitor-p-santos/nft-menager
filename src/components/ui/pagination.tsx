import chevronRight from '@/assets/icons/chevron-right.svg'
import { cn } from '@/lib/utils'

type Props = {
  /** Nome acessível do `<nav>` (ex.: "Paginação do catálogo"). */
  label: string
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

/** Lista as páginas ao redor da atual, com reticências quando há muitas. */
function pageItems(page: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total))
  const sorted = [...set].sort((a, b) => a - b)
  return sorted.flatMap((p, i) => (i > 0 && p - (sorted[i - 1] ?? p) > 1 ? ['gap' as const, p] : [p]))
}

const itemClass =
  'flex size-[35px] cursor-pointer items-center justify-center rounded-sm border text-body-lg leading-5 transition-colors'

/**
 * Paginação do Figma (catálogo): quadrados de 35px, raio 4, gap 8; página atual em âmbar.
 * Compartilhada pelo catálogo e pela lista de pedidos ("Atividade").
 */
export function Pagination({ label, page, totalPages, onPageChange, className }: Props & { className?: string }) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label={label} className={cn('flex justify-center md:justify-end', className)}>
      <ul className="flex items-center gap-2">
        {page > 1 && (
          <li>
            <button
              type="button"
              aria-label="Página anterior"
              onClick={() => onPageChange(page - 1)}
              className={cn(itemClass, 'border-border-soft hover:border-primary')}
            >
              <img src={chevronRight} alt="" width={12} height={7} className="rotate-90" />
            </button>
          </li>
        )}
        {pageItems(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden className="px-1 text-muted-foreground">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                aria-label={`Página ${item}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => item !== page && onPageChange(item)}
                className={cn(
                  itemClass,
                  item === page
                    ? 'border-primary bg-primary font-bold text-primary-foreground'
                    : 'border-border-soft text-foreground hover:border-primary',
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}
        {page < totalPages && (
          <li>
            <button
              type="button"
              aria-label="Próxima página"
              onClick={() => onPageChange(page + 1)}
              className={cn(itemClass, 'border-border-soft hover:border-primary')}
            >
              <img src={chevronRight} alt="" width={12} height={7} className="-rotate-90" />
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}
