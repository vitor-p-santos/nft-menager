import { Link } from '@tanstack/react-router'
import heartBadgeFilled from '@/assets/icons/heart-badge-filled.svg'
import heartBadge from '@/assets/icons/heart-badge.svg'
import heartFilled from '@/assets/icons/heart-filled.svg'
import heartOutline from '@/assets/icons/heart-outline.svg'
import heartSmFilled from '@/assets/icons/heart-sm-filled.svg'
import heartSmOutline from '@/assets/icons/heart-sm-outline.svg'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { useFavorite } from '../hooks/use-favorite'

type Variant = 'badge' | 'round' | 'button'

/**
 * Coração de favoritar nas três formas do Figma:
 * - `badge`: 28px sobre a arte do card (catálogo e "Mais desta coleção");
 * - `round`: 35px no hero mobile do detalhe;
 * - `button`: "Favoritar" 130×40 com contorno no detalhe desktop.
 * O estado "favoritado" (coração cheio) foi derivado do contorno do Figma (research.md, D-11).
 */
export function FavoriteButton({ nftId, nftName, variant, className }: { nftId: string; nftName: string; variant: Variant; className?: string }) {
  const { isFavorite, isPending, toggleFavorite, feedback, buttonRef } = useFavorite(nftId, nftName)
  const label = isFavorite ? `Remover ${nftName} dos favoritos` : `Favoritar ${nftName}`

  return (
    <span className={cn('relative inline-flex', className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-pressed={isFavorite}
        aria-busy={isPending}
        aria-label={variant === 'button' ? undefined : label}
        onClick={toggleFavorite}
        className={cn(
          'cursor-pointer',
          variant === 'badge' && 'size-7 rounded-full',
          variant === 'round' && 'flex size-[35px] items-center justify-center rounded-full border border-border bg-surface-raised',
          variant === 'button' && cn(buttonVariants({ variant: 'outline', size: 'none' }), 'h-10 w-[130px] gap-2 rounded-md text-body leading-5 font-medium'),
        )}
      >
        {variant === 'badge' && <img src={isFavorite ? heartBadgeFilled : heartBadge} alt="" width={28} height={28} />}
        {variant === 'round' && <img src={isFavorite ? heartSmFilled : heartSmOutline} alt="" width={16} height={14} />}
        {variant === 'button' && (
          <>
            <img src={isFavorite ? heartFilled : heartOutline} alt="" width={20} height={20} />
            {isFavorite ? 'Favoritado' : 'Favoritar'}
            <span className="sr-only"> {nftName}</span>
          </>
        )}
      </button>
      {/* Região viva sempre montada (anúncio confiável) e balão visível enquanto há mensagem */}
      <output
        aria-live="polite"
        className={cn(
          'pointer-events-none absolute z-20 w-max max-w-[130px] md:max-w-[170px] rounded-md border border-border bg-card px-2 py-1 text-caption leading-[14px] text-foreground',
          variant === 'badge' ? 'top-0 right-full mr-1.5' : 'top-full right-0 mt-2',
          !feedback && 'sr-only',
        )}
      >
        {feedback?.loginRedirect ? (
          <Link
            to="/entrar"
            search={{ redirect: feedback.loginRedirect }}
            className="pointer-events-auto rounded-sm underline underline-offset-4"
          >
            {feedback.message}
          </Link>
        ) : (
          feedback?.message
        )}
      </output>
    </span>
  )
}
