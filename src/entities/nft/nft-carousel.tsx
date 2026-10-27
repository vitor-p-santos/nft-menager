import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ErrorState } from '@/components/feedback/states'
import { cn } from '@/lib/utils'
import { NftCard, NftCardSkeleton } from './nft-card'
import type { NftSummary } from './schema'

/** 2 cards no mobile, 3 no tablet e 5 de 218px no desktop (1200 = 5×218 + 4×27,5). */
const ITEM = 'w-[calc((100%-16px)/2)] shrink-0 snap-start md:w-[calc((100%-55px)/3)] xl:w-[calc((100%-110px)/5)]'
const TRACK = 'flex gap-4 md:gap-[27.5px]'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Carrossel de NFTs do Figma ("Related" do detalhe e "Colecionadores também viram" do carrinho):
 * rolagem nativa (snap), acessível por teclado (Tab percorre os cards) e paginador de pontos de
 * 12px (ativo preenchido). Recebe o estado da query de quem o usa; a ação do card entra por
 * `renderAction`, para que nenhuma feature importe outra.
 */
export function NftCarousel({
  title,
  items,
  isError,
  onRetry,
  errorTitle,
  renderAction,
}: {
  title: string
  items: NftSummary[] | undefined
  isError: boolean
  onRetry: () => void
  errorTitle: string
  renderAction?: (nft: NftSummary) => ReactNode
}) {
  const titleId = useId()
  const trackRef = useRef<HTMLUListElement>(null)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(0)

  const measure = useCallback(() => {
    const el = trackRef.current
    if (!el || el.clientWidth === 0) return
    setPages(Math.max(1, Math.round(el.scrollWidth / el.clientWidth)))
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
    setPage(atEnd ? Math.round(el.scrollWidth / el.clientWidth) - 1 : Math.round(el.scrollLeft / el.clientWidth))
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure, items])

  function goTo(index: number) {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: index * el.clientWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  let content
  if (isError && !items) {
    content = <ErrorState title={errorTitle} action={{ label: 'Tentar novamente', onClick: onRetry }} />
  } else if (!items) {
    content = (
      <ul aria-hidden className={cn(TRACK, 'overflow-hidden')}>
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className={ITEM}>
            <NftCardSkeleton />
          </li>
        ))}
      </ul>
    )
  } else if (items.length === 0) {
    return null
  } else {
    content = (
      <>
        <ul
          ref={trackRef}
          onScroll={measure}
          className={cn(TRACK, '-m-1.5 snap-x snap-mandatory scroll-px-1.5 overflow-x-auto p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden')}
        >
          {items.map((nft) => (
            <li key={nft.id} className={ITEM}>
              <NftCard nft={nft} action={renderAction?.(nft)} />
            </li>
          ))}
        </ul>
        {pages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para a página ${i + 1} de ${pages}`}
                aria-current={i === page}
                onClick={() => goTo(i)}
                className={cn(
                  'relative size-3 cursor-pointer rounded-full border border-primary before:absolute before:-inset-2 before:content-[""]',
                  i === page && 'bg-primary',
                )}
              />
            ))}
          </div>
        )}
      </>
    )
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-8">
      <h2 id={titleId} className="border-b-[0.3px] border-primary pb-3 text-body-xl leading-4 font-bold text-text-accent">
        {title}
      </h2>
      {content}
    </section>
  )
}
