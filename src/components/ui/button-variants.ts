import { cva } from 'class-variance-authority'

/**
 * Botões do Figma: primário âmbar com texto ink (EXPLORAR, Aplicar, Entrar, Enviar),
 * contorno (Favoritar), link de texto (Continuar explorando, Ler mais), as pílulas em gradiente
 * do mobile (Comprar NFT, Finalizar, Confirmar compra) e o botão redondo (Voltar).
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
        /**
         * Pílula em gradiente do mobile (Buy Bar "Comprar NFT"). Use com `size: 'pill'`. As variantes
         * em gradiente mantêm o cursor do estado desabilitado/ocupado (`cursor-wait`, `cursor-not-allowed`).
         */
        cta: 'bg-[image:var(--gradient-cta)] font-bold text-primary-foreground disabled:pointer-events-auto aria-disabled:pointer-events-auto',
        /** "Finalizar" (carrinho) e "Confirmar compra" (pagamento): pílula em gradiente no mobile, âmbar a partir de `md`. */
        checkout:
          'bg-[image:var(--gradient-checkout)] font-bold text-primary-foreground disabled:pointer-events-auto aria-disabled:pointer-events-auto md:bg-primary md:bg-none',
        /** Botão redondo em Surface Raised com borda (voltar, carrinho da Buy Bar). Medida pelo `className`. */
        round: 'rounded-full border border-border bg-surface-raised disabled:pointer-events-auto',
      },
      size: {
        /** 40px — EXPLORAR, Comprar, Conectar e finalizar */
        lg: 'h-10 rounded-md px-7 text-body-lg leading-5 font-bold',
        /** 35px — Entrar (header) */
        md: 'h-[35px] rounded-md px-2.5 text-body-lg font-medium',
        /** Aplicar (filtros) */
        sm: 'rounded-md px-3 py-2 text-body-lg leading-5 font-bold',
        icon: 'size-[35px] rounded-sm',
        /** 60px, raio 40 — CTAs do mobile (Buy Bar, carrinho, pagamento) */
        pill: 'h-[60px] rounded-[40px]',
        none: '',
      },
    },
    defaultVariants: { variant: 'primary', size: 'lg' },
  },
)
