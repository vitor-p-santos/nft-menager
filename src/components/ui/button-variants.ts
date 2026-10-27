import { cva } from 'class-variance-authority'

/**
 * Botões do Figma: primário âmbar com texto ink (EXPLORAR, Aplicar, Entrar, Enviar),
 * contorno (Favoritar) e link de texto (Continuar explorando, Ler mais).
 */
export const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap transition-[color,background-color,opacity] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border border-primary text-text-accent hover:bg-primary/10',
        ghost: 'text-foreground hover:bg-accent',
        link: 'text-text-accent underline-offset-4 hover:underline',
      },
      size: {
        /** 40px — EXPLORAR, Comprar, Conectar e finalizar */
        lg: 'h-10 rounded-md px-7 text-body-lg leading-5 font-bold',
        /** 35px — Entrar (header) */
        md: 'h-[35px] rounded-md px-2.5 text-body-lg font-medium',
        /** Aplicar (filtros) */
        sm: 'rounded-md px-3 py-2 text-body-lg leading-5 font-bold',
        icon: 'size-[35px] rounded-sm',
        none: '',
      },
    },
    defaultVariants: { variant: 'primary', size: 'lg' },
  },
)
