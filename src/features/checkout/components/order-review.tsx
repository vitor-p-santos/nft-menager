import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/feedback/skeleton'
import type { CartItem, Totals } from '@/entities/cart'
import { formatEthLabel } from '@/lib/money'
import { cn } from '@/lib/utils'
import { ResponsiveImage } from '@/components/ui/responsive-image'

/**
 * "Seus NFTs" (Figma Checkout Page, coluna direita de 405px): cabeçalho NFTs/Subtotal com a linha
 * âmbar de 0,3px, linhas de 70px em Surface Card (arte 70×70, nome Body Large/16 Bold, ID do token
 * Body/14 Secondary, quantidade e subtotal Body Large/18 Bold Accent).
 */
export function OrderItems({ items }: { items: CartItem[] }) {
  return (
    <section aria-labelledby="checkout-itens-titulo" className="flex flex-col gap-3">
      <h2 id="checkout-itens-titulo" className="text-body-xl leading-4 font-bold text-foreground">
        Seus NFTs
      </h2>
      <table className="-my-3 w-full border-separate border-spacing-y-3">
        <caption className="sr-only">Itens do pedido</caption>
        <thead>
          <tr className="text-body-lg leading-4 text-foreground">
            <th scope="col" className="border-b-[0.3px] border-primary p-0 pb-3 text-left font-medium">
              NFTs
            </th>
            <th scope="col" className="border-b-[0.3px] border-primary p-0 pb-3">
              <span className="sr-only">Edições</span>
            </th>
            <th scope="col" className="border-b-[0.3px] border-primary p-0 pb-3 text-right font-medium">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="bg-card">
              <th scope="row" aria-label={item.nft.name} className="h-[70px] w-full max-w-0 p-0 pl-1 text-left font-normal">
                <div className="flex items-center gap-2">
                  <ResponsiveImage
                    src={item.nft.image.src}
                    sizes="70px"
                    alt=""
                    width={70}
                    height={70}
                    loading="lazy"
                    className="size-[70px] shrink-0 rounded-md object-cover"
                  />
                  <div className="flex min-w-0 flex-col gap-1.5 leading-4">
                    <Link
                      to="/nft/$nftId"
                      params={{ nftId: item.nftId }}
                      className="rounded-sm text-body-md font-bold break-words text-foreground hover:text-text-accent"
                    >
                      {item.nft.name}
                    </Link>
                    <span className="truncate text-body text-secondary">ID do token: {item.nft.tokenId}</span>
                  </div>
                </div>
              </th>
              <td className="p-0 px-1.5 text-center text-body leading-4 whitespace-nowrap text-text-secondary">
                <span className="sr-only">Quantidade: </span>(x {item.quantity})
              </td>
              <td className="p-0 pr-3 text-right text-lead leading-4 font-bold whitespace-nowrap text-text-accent">
                {formatEthLabel(item.lineTotalWei)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

type OrderTotalsProps = {
  totals: Totals
  couponCode?: string | null
  /** Esconde as linhas de subtotal/desconto/taxa (mobile mostra só o total, como no m-04). */
  compact?: boolean
}

/**
 * Totais do servidor (wei): Subtotal, "Desconto do lançamento", "Taxa de rede" + "Taxa estimada",
 * linha divisória e Total. O cupom é aplicado no carrinho: "Aplique aqui" volta para lá.
 */
export function OrderTotals({ totals, couponCode, compact }: OrderTotalsProps) {
  if (compact) {
    return (
      <p className="flex items-baseline justify-end gap-[30px] text-lead leading-6 font-bold">
        <span className="text-foreground">Total:</span>
        <span className="text-text-accent">{formatEthLabel(totals.totalWei)}</span>
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-body leading-5 text-foreground">
        Tem um código promocional?{' '}
        <Link to="/carrinho" className="rounded-sm underline-offset-4 hover:text-text-accent hover:underline">
          Aplique aqui
        </Link>
      </p>
      <dl className="flex flex-col text-body-lg leading-5 text-foreground">
        <div className="flex items-baseline justify-between gap-2">
          <dt>Subtotal</dt>
          <dd className="text-lead whitespace-nowrap">{formatEthLabel(totals.subtotalWei)}</dd>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-2">
          <dt>{couponCode ? `Desconto (${couponCode})` : 'Desconto do lançamento'}</dt>
          <dd className="whitespace-nowrap">(-) {formatEthLabel(totals.discountWei)}</dd>
        </div>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-3">
          <dt>Taxa de rede</dt>
          <dd className="text-lead whitespace-nowrap">{formatEthLabel(totals.networkFeeWei)}</dd>
          <dd className="w-full text-center text-caption leading-4 text-text-accent">Taxa estimada</dd>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-2 border-t-[0.3px] border-primary px-[42px] pt-3 font-bold">
          <dt>Total</dt>
          <dd className="text-lead whitespace-nowrap text-text-accent">{formatEthLabel(totals.totalWei)}</dd>
        </div>
      </dl>
    </div>
  )
}

export function OrderReviewSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('flex flex-col gap-3', className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-full" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex h-[70px] items-center gap-2.5 bg-card pl-1">
          <Skeleton className="size-[70px] rounded-md" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  )
}
