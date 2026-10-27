import { useId } from 'react'
import { EDITION_LABELS, type Edition, type Nft } from '@/entities/nft'
import { cn } from '@/lib/utils'

/**
 * Edições em pílulas elípticas (Figma: elipses de 28px com traço de 1px Color/Border; ativa em
 * Color/Primary com Body/14 Medium âmbar). Radios nativos: setas do teclado e leitores de tela
 * funcionam sem script. Edição esgotada fica desabilitada.
 */
export function EditionSelector({
  editions,
  value,
  onChange,
  className,
}: {
  editions: Nft['editions']
  value: Edition | null
  onChange: (edition: Edition) => void
  className?: string
}) {
  const name = useId()
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="float-left mb-2 w-full text-body-md leading-4 font-bold text-foreground md:mb-3">Edição:</legend>
      <div className="clear-left flex flex-wrap items-center gap-3 md:gap-1.5">
        {editions.map(({ edition, available }) => {
          const soldOut = available === 0
          const checked = value === edition
          return (
            <label
              key={edition}
              className={cn(
                'relative flex h-7 min-w-9 items-center justify-center rounded-[50%] border px-1.5 text-body leading-4 whitespace-nowrap',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                edition === 'open' && 'px-2',
                checked ? 'border-primary font-medium text-text-accent' : 'border-border text-muted-foreground',
                soldOut ? 'cursor-not-allowed line-through opacity-50' : 'cursor-pointer',
              )}
            >
              <input
                type="radio"
                name={name}
                value={edition}
                checked={checked}
                disabled={soldOut}
                onChange={() => onChange(edition)}
                className="sr-only"
              />
              {EDITION_LABELS[edition]}
              <span className="sr-only">{soldOut ? ' (esgotada)' : ` (${available} disponíveis)`}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
