import { Link } from '@tanstack/react-router'
import { Fragment } from 'react'
import { cn } from '@/lib/utils'
import { BackButton, type BackFallback } from './back-button'

/** Item da trilha: com `to`, é link; sem `to`, é a página atual (`aria-current`). */
export type Crumb = { label: string; to?: '/' | '/atividade'; hash?: string }

/** Trilha de navegação do desktop ("Início / Mercado / Carrinho"). */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Trilha de navegação" className={className}>
      <ol className="flex gap-1 text-body-md leading-4 font-bold text-foreground">
        {items.map((item, index) => (
          <Fragment key={item.label}>
            {index > 0 && <li aria-hidden>/</li>}
            {item.to ? (
              <li>
                <Link to={item.to} hash={item.hash} className="rounded-sm hover:text-text-accent">
                  {item.label}
                </Link>
              </li>
            ) : (
              <li aria-current="page">{item.label}</li>
            )}
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}

type PageHeadingProps = {
  /** Título (h1) do topo mobile, ao lado do "Voltar". */
  title: string
  /** h1 do desktop, só para leitores de tela (padrão: `title`). */
  desktopTitle?: string
  fallback: BackFallback
  /** `center`: título centralizado e voltar à esquerda (carrinho, pedidos, conta); `start`: lado a lado (pagamento). */
  align?: 'center' | 'start'
}

/**
 * Cabeçalho das telas internas: no mobile, voltar + título; do `md` em diante o h1 fica só para
 * leitores de tela (a trilha visível é o `Breadcrumbs`).
 */
export function PageHeading({ title, desktopTitle = title, fallback, align = 'center' }: PageHeadingProps) {
  const centered = align === 'center'
  return (
    <>
      <div className={cn('flex items-center md:hidden', centered ? 'relative h-[35px] justify-center' : 'gap-6')}>
        <BackButton fallback={fallback} className={cn(centered && 'absolute left-0')} />
        <h1 className="text-title-sm leading-6 font-bold text-foreground">{title}</h1>
      </div>
      <h1 className="sr-only max-md:hidden">{desktopTitle}</h1>
    </>
  )
}
