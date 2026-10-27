import minusRoundDisabledIcon from '@/assets/icons/minus-round-disabled.svg'
import minusRoundIcon from '@/assets/icons/minus-round.svg'
import minusIcon from '@/assets/icons/minus.svg'
import plusIcon from '@/assets/icons/plus.svg'
import { cn } from '@/lib/utils'

/**
 * `lg`: detalhe desktop. `sm`: Buy Bar mobile. `row`: linha da tabela do carrinho (mesmo botão do
 * `sm`, valor em Body Large/17). `round`: card do carrinho mobile (círculos de 24px).
 */
type Size = 'lg' | 'sm' | 'row' | 'round'

const BUTTON: Record<Exclude<Size, 'round'>, string> = {
  /** Desktop: 33×49,5 com ícone de 26,4px */
  lg: 'h-[49.5px] w-[33px] shadow-stepper',
  /** Mobile (Buy Bar) e carrinho desktop: 20×30 com ícone de 16px */
  sm: 'h-[30px] w-5 shadow-stepper-sm',
  row: 'h-[30px] w-5 shadow-stepper-sm',
}
const ICON: Record<Exclude<Size, 'round'>, number> = { lg: 26.4, sm: 16, row: 16 }
const VALUE: Record<Size, string> = {
  lg: 'text-title-sm leading-7',
  sm: 'text-lead leading-[25px] font-medium',
  row: 'text-body-xl leading-6',
  round: 'text-body-lg leading-[22px]',
}

/**
 * Quantidade entre 1 e `max` (disponível da edição). O valor é anunciado por `aria-live`.
 * `itemName` completa os rótulos quando há vários steppers na tela (carrinho).
 */
export function QuantityStepper({
  value,
  max,
  onChange,
  size,
  disabled: disabledProp = false,
  itemName,
  className,
}: {
  value: number
  max: number
  onChange: (value: number) => void
  size: Size
  disabled?: boolean
  itemName?: string
  className?: string
}) {
  const soldOut = max < 1
  const disabled = disabledProp || soldOut
  const suffix = itemName ? ` de ${itemName}` : ''
  const canDecrease = !disabled && value > 1
  const canIncrease = !disabled && value < max

  if (size === 'round') {
    // Figma Mobile / Carrinho: "−" em SVG (apagado no mínimo) e "+" em texto de 21px no mesmo círculo
    const circle = 'flex size-6 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed'
    return (
      <fieldset className={cn('flex min-w-0 items-center gap-3', className)}>
        <legend className="sr-only">Quantidade{suffix}</legend>
        <button type="button" aria-label={`Diminuir quantidade${suffix}`} disabled={!canDecrease} onClick={() => onChange(value - 1)} className={circle}>
          <img src={canDecrease ? minusRoundIcon : minusRoundDisabledIcon} alt="" width={24} height={24} />
        </button>
        <output aria-live="polite" className={cn('min-w-[1ch] text-center text-foreground tabular-nums', VALUE.round)}>
          {value}
          <span className="sr-only">{soldOut ? ', esgotado' : ` de no máximo ${max}`}</span>
        </output>
        <button
          type="button"
          aria-label={`Aumentar quantidade${suffix}`}
          disabled={!canIncrease}
          onClick={() => onChange(value + 1)}
          className={cn(circle, 'border border-border bg-surface-raised text-[21px] leading-4 text-foreground disabled:opacity-40')}
        >
          <span aria-hidden>+</span>
        </button>
      </fieldset>
    )
  }

  const buttonClass = cn(
    'flex cursor-pointer items-center justify-center rounded-full border border-ink bg-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-40',
    BUTTON[size],
  )

  return (
    <fieldset className={cn('flex min-w-0 items-center gap-3', className)}>
      <legend className="sr-only">Quantidade{suffix}</legend>
      <button type="button" aria-label={`Diminuir quantidade${suffix}`} disabled={!canDecrease} onClick={() => onChange(value - 1)} className={buttonClass}>
        <img src={minusIcon} alt="" width={ICON[size]} height={ICON[size]} />
      </button>
      <output aria-live="polite" className={cn('min-w-[1ch] text-center text-foreground tabular-nums', VALUE[size])}>
        {value}
        <span className="sr-only">{soldOut ? ', esgotado' : ` de no máximo ${max}`}</span>
      </output>
      <button type="button" aria-label={`Aumentar quantidade${suffix}`} disabled={!canIncrease} onClick={() => onChange(value + 1)} className={buttonClass}>
        <img src={plusIcon} alt="" width={ICON[size]} height={ICON[size]} />
      </button>
    </fieldset>
  )
}
