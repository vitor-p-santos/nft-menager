import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Radios nativos (não o RadioGroup do Radix): setas do teclado, leitores de tela e o
 * `getByRole('radio', { name })`/`.check()` dos testes funcionam sem script, e cada tela desenha a
 * opção como o Figma pede (cartão de carteira, linha de provedor, pílula de edição).
 * - `RadioGroup`: contêiner `role="radiogroup"` (nome via `aria-labelledby`);
 * - `RadioGroupItem`: o `<input type="radio">` oculto (`peer`), dentro do `<label>` da opção;
 * - `RadioIndicator`: a marca visual de 16px.
 */
function RadioGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div role="radiogroup" data-slot="radio-group" className={className} {...props} />
}

function RadioGroupItem({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  return <input type="radio" data-slot="radio-group-item" className={cn('peer sr-only', className)} {...props} />
}

/**
 * Marca do radio (16px): anel de 1,5px com ponto central quando marcado. Tom `soft` = anel vazio
 * Color/Border Soft (mobile, m-04); `primary` = sempre Color/Primary (desktop, d-04).
 */
function RadioIndicator({ checked, tone = 'primary', className }: { checked: boolean; tone?: 'soft' | 'primary'; className?: string }) {
  return (
    <span
      aria-hidden
      data-slot="radio-indicator"
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px]',
        checked || tone === 'primary' ? 'border-primary' : 'border-border-soft',
        className,
      )}
    >
      {checked && <span className="size-2 rounded-full bg-primary" />}
    </span>
  )
}

export { RadioGroup, RadioGroupItem, RadioIndicator }
