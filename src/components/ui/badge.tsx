import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Selos do app, com as medidas que já estavam nas telas:
 * - `rare`: "RARO" sobre a arte do card (Figma "Products"), 68×32 em Color/Primary com texto Ink;
 * - `seal`: "METAMASK • WALLETCONNECT • COINBASE" (Checkout Page e footer), 26px, raio 6px,
 *   borda Color/Border Soft sobre Surface Dark, texto Tiny âmbar;
 * - `status`: estado do pedido (sem frame no Figma), 24px com borda e texto na cor do `tone`.
 */
const badgeVariants = cva('inline-flex items-center font-bold whitespace-nowrap', {
  variants: {
    variant: {
      rare: 'h-8 w-[68px] bg-primary px-2 text-caption leading-[14px] text-primary-foreground',
      seal: 'h-[26px] rounded-md border border-border-soft bg-surface-dark px-2 text-tiny leading-normal tracking-[0.1px] whitespace-pre text-text-accent',
      status: 'h-6 gap-1 rounded-sm border px-2 text-caption leading-4',
    },
    tone: {
      accent: 'border-primary text-text-accent',
      success: 'border-success text-success',
      destructive: 'border-destructive text-destructive',
    },
  },
  defaultVariants: { variant: 'status' },
})

type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }

function Badge({ className, variant, tone, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : 'span'
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant, tone }), className)} {...props} />
}

export { Badge }
