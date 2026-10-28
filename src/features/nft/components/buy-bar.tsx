import shopIcon from '@/assets/icons/shop.svg'
import { LiveMessage } from '@/components/feedback/live-message'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import type { Nft } from '@/entities/nft'
import type { NftPurchase } from '../hooks/use-nft-purchase'
import { NftPrice } from './nft-price'
import { CART_FEEDBACK_CLASS } from './purchase-panel'

/**
 * "Buy Bar" do mobile: fixa no rodapé (164px), com quantidade, preço, "Comprar NFT" (adiciona e abre
 * o carrinho) e o botão de carrinho (só adiciona e anuncia). O espaçador reserva a altura para não
 * cobrir o fim da página.
 */
export function BuyBar({ nft, purchase }: { nft: Nft; purchase: NftPurchase }) {
  const { quantity, available, soldOut, isPending } = purchase
  return (
    <>
      <div aria-hidden className="h-[164px] md:hidden" />
      <section
        aria-label="Comprar"
        className="fixed inset-x-0 bottom-0 z-40 flex h-[164px] flex-col gap-5 rounded-t-[40px] bg-card px-6 pt-5 pb-9 shadow-buy-bar md:hidden"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-body-md leading-4 font-medium text-muted-foreground">
              Qtd.
            </span>
            <QuantityStepper size="sm" value={quantity} max={available} onChange={purchase.setQuantity} />
          </div>
          <NftPrice nft={nft} className="min-w-0 justify-end gap-y-1 text-right text-title-sm leading-4" />
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="cta"
            size="pill"
            disabled={soldOut}
            aria-busy={isPending}
            onClick={() => purchase.addToCart(true)}
            className="w-[196px] text-body-lg leading-5 disabled:cursor-not-allowed aria-busy:cursor-wait"
          >
            {soldOut ? 'Esgotado' : 'Comprar NFT'}
          </Button>
          <Button
            type="button"
            variant="round"
            size="none"
            disabled={soldOut}
            aria-busy={isPending}
            aria-label="Adicionar ao carrinho"
            onClick={() => purchase.addToCart(false)}
            className="size-[60px] disabled:cursor-not-allowed aria-busy:cursor-wait"
          >
            <img src={shopIcon} alt="" width={20} height={20} />
          </Button>
        </div>
        {/* Mesma mensagem da área desktop: a Buy Bar tem altura fixa, então ela flutua acima */}
        <LiveMessage
          feedback={purchase.feedback}
          statusClassName="text-text-accent"
          className={`${CART_FEEDBACK_CLASS} absolute inset-x-6 -top-8 rounded-md bg-surface-raised px-3 py-2 empty:hidden`}
        />
      </section>
    </>
  )
}
