import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Checkbox do Figma: círculo âmbar de 16px (borda Color/Primary de 1,5px) com ponto central quando
 * marcado ("Usar outra carteira?" no checkout, "Igual à carteira principal" nas carteiras).
 * O `<input type="checkbox">` real fica oculto (`peer`) logo antes do indicador: o estado e o foco
 * visível vêm dele por CSS, então funciona controlado ou não, e `getByLabel`/`.check()` seguem
 * valendo. Use dentro de um `<label>` com o texto. `className` vai para o indicador visível.
 */
function Checkbox({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <>
      <input type="checkbox" data-slot="checkbox" className="peer sr-only" {...props} />
      <span
        aria-hidden
        data-slot="checkbox-indicator"
        className={cn(
          'flex size-4 items-center justify-center rounded-full border-[1.5px] border-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-checked:*:block',
          className,
        )}
      >
        <span className="hidden size-2 rounded-full bg-primary" />
      </span>
    </>
  )
}

export { Checkbox }
