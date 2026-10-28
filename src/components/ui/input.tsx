import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Controle de texto do app (checkout, perfil e carteiras). Medidas do "Perfil do colecionador"
 * (Figma Checkout Page `70522:3321`, recorte d-04), as mesmas de Desktop/Perfil e Carteiras (d-08/d-09):
 * 40px de altura, borda Color/Border de 1px, raio de 4px, fundo Ink e placeholder Color/Secondary.
 * Erro via `aria-invalid` (borda Color/Destructive). Também serve de base ao `Select` e ao textarea.
 */
export const controlClass =
  'h-10 w-full min-w-0 rounded-sm border border-border bg-background px-3 text-body leading-4 text-foreground placeholder:text-secondary transition-colors focus-visible:border-primary focus-visible:outline-none aria-[invalid=true]:border-destructive disabled:cursor-not-allowed disabled:opacity-60'

function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return <input type={type} data-slot="input" className={cn(controlClass, className)} {...props} />
}

export { Input }
