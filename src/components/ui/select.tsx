import type { ComponentProps } from 'react'
import chevronDown from '@/assets/icons/chevron-down.svg'
import { cn } from '@/lib/utils'
import { controlClass } from './input'

/**
 * Select nativo (padrão "native select" do shadcn): teclado, leitores de tela e o `selectOption`
 * dos testes funcionam sem script. Mesmo controle do `Input`, com a seta "Arrow - Down 2" do Figma.
 * Placeholder = `<option value="" disabled>` + `required`: o `:invalid` pinta o texto em Color/Secondary.
 */
function Select({ className, wrapperClassName, ...props }: ComponentProps<'select'> & { wrapperClassName?: string }) {
  return (
    <div data-slot="select-wrapper" className={cn('relative', wrapperClassName)}>
      <select
        data-slot="select"
        className={cn(controlClass, 'cursor-pointer appearance-none pr-10 invalid:text-secondary', className)}
        {...props}
      />
      {/* Seta na cor do placeholder (Color/Secondary): o SVG do Figma vira máscara */}
      <span
        aria-hidden
        style={{ maskImage: `url("${chevronDown}")` }}
        className="pointer-events-none absolute top-1/2 right-[30px] h-1.5 w-[11px] -translate-y-1/2 bg-secondary [mask-repeat:no-repeat] [mask-size:100%_100%]"
      />
    </div>
  )
}

/** Opção em Color/Foreground (o placeholder desabilitado herda Color/Secondary do `:invalid`). */
function SelectOption({ className, ...props }: ComponentProps<'option'>) {
  return <option data-slot="select-option" className={cn('text-foreground', className)} {...props} />
}

export { Select, SelectOption }
