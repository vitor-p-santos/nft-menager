import { hasDiscount, type Nft } from '@/entities/nft'
import { formatEthLabel } from '@/lib/money'
import { cn } from '@/lib/utils'

/** Preço do detalhe (âmbar), com o preço anterior riscado quando há desconto. */
export function NftPrice({ nft, className }: { nft: Nft; className?: string }) {
  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-3 font-bold text-text-accent', className)}>
      <span>
        <span className="sr-only">Preço: </span>
        {formatEthLabel(nft.priceWei)}
      </span>
      {hasDiscount(nft) && (
        <s className="text-body-md font-normal text-muted-foreground">
          <span className="sr-only">Preço anterior: </span>
          {formatEthLabel(nft.compareAtPriceWei)}
        </s>
      )}
    </p>
  )
}
