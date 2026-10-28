import { LiveMessage } from '@/components/feedback/live-message'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import type { Nft } from '@/entities/nft'
import type { NftPurchase } from '../hooks/use-nft-purchase'
import { FavoriteButton } from './favorite-button'

/** Mensagem do carrinho (Caption/12): âmbar no sucesso, vermelha no erro. */
export const CART_FEEDBACK_CLASS = 'text-caption leading-4'

/** Desktop/tablet: quantidade, "COMPRAR" (adiciona e abre o carrinho) e "Favoritar". */
export function PurchasePanel({ nft, purchase }: { nft: Nft; purchase: NftPurchase }) {
  const { quantity, available, soldOut, isPending } = purchase
  return (
    <div className="hidden flex-wrap items-center justify-between gap-4 md:flex">
      <QuantityStepper size="lg" value={quantity} max={available} onChange={purchase.setQuantity} />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="none"
          disabled={soldOut}
          aria-busy={isPending}
          onClick={() => purchase.addToCart(true)}
          className="h-10 w-[130px] rounded-md text-body leading-5 font-bold disabled:pointer-events-auto disabled:cursor-not-allowed aria-busy:cursor-wait"
        >
          {soldOut ? 'ESGOTADO' : 'COMPRAR'}
        </Button>
        <FavoriteButton nftId={nft.id} nftName={nft.name} variant="button" />
      </div>
      <LiveMessage feedback={purchase.feedback} statusClassName="text-text-accent" className={`${CART_FEEDBACK_CLASS} w-full empty:hidden`} />
    </div>
  )
}
