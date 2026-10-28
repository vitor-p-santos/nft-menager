import { NETWORK_LABELS, type Network } from '@/entities/nft'
import { shortAddress, WALLET_PROVIDER_LABELS } from '@/entities/wallet'
import { formatEthLabel } from '@/lib/money'
import { cn } from '@/lib/utils'
import { formatReceiptDate } from './format'
import type { Order } from './schema'
import { buttonVariants } from '@/components/ui/button-variants'
import { ResponsiveImage } from '@/components/ui/responsive-image'

/** Exploradores de bloco por rede ("Ver no Etherscan" no Figma). */
const EXPLORERS: Record<Network, { label: string; txUrl: (hash: string) => string }> = {
  ethereum: { label: 'Etherscan', txUrl: (hash) => `https://etherscan.io/tx/${hash}` },
  polygon: { label: 'Polygonscan', txUrl: (hash) => `https://polygonscan.com/tx/${hash}` },
  solana: { label: 'Solscan', txUrl: (hash) => `https://solscan.io/tx/${hash}` },
}

function InfoCell({ label, value, strong, className }: { label: string; value: string; strong?: boolean; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5 text-body leading-[19px] text-text-secondary', className)}>
      <dt className={cn(strong && 'font-bold')}>{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  )
}

/**
 * Corpo do recibo (Figma Order Confirmation Modal `70376:239`, 578×821, medido no recorte d-05):
 * faixa com ID da transação/Data/Total/Carteira entre linhas âmbar, "Detalhes da transação" com os
 * itens congelados do pedido, taxa, total, mensagem e "Ver no Etherscan". Só renderiza pedidos
 * `confirmed` (o recibo é um snapshot imutável; ver data-model.md). O ícone e o título ficam com
 * quem compõe (modal no desktop, página no mobile).
 */
export function OrderReceipt({ order }: { order: Order }) {
  const explorer = EXPLORERS[order.network]
  const txHash = order.txHash ?? order.id

  return (
    <div className="flex flex-col">
      <dl className="grid grid-cols-2 gap-y-3 border-y border-primary px-6 py-4 md:flex md:items-center md:justify-between md:px-9 md:py-[17px]">
        <InfoCell label="ID da transação" value={shortAddress(txHash)} strong />
        <InfoCell label="Data" value={formatReceiptDate(order.updatedAt)} className="md:border-l md:border-primary md:pl-4" />
        <InfoCell label="Total" value={formatEthLabel(order.totals.totalWei)} className="md:border-l md:border-primary md:pl-4" />
        <InfoCell
          label="Carteira"
          value={WALLET_PROVIDER_LABELS[order.wallet.provider]}
          strong
          className="md:border-l md:border-primary md:pl-4"
        />
      </dl>

      <div className="flex flex-col px-6 pt-7 md:px-11">
        <h3 className="text-body-md leading-4 font-bold text-foreground">Detalhes da transação</h3>
        <table className="mt-3 w-full border-separate border-spacing-0">
          <caption className="sr-only">NFTs do pedido</caption>
          <thead>
            <tr className="text-body-lg leading-4 font-bold text-foreground">
              <th scope="col" className="border-b-[0.3px] border-primary pb-3 text-left font-bold">
                NFTs
              </th>
              <th scope="col" className="border-b-[0.3px] border-primary pb-3 px-2 text-center font-bold md:px-4">
                Edições
              </th>
              <th scope="col" className="border-b-[0.3px] border-primary pb-3 text-right font-bold">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <th scope="row" aria-label={item.nft.name} className="w-full pt-3 text-left font-normal">
                  <div className="flex items-center gap-3">
                    <ResponsiveImage
                      src={item.nft.image.src}
                      sizes="70px"
                      alt=""
                      width={70}
                      height={70}
                      loading="lazy"
                      className="size-[52px] shrink-0 rounded-md object-cover md:size-[70px]"
                    />
                    <div className="flex min-w-0 flex-col gap-1.5 leading-4">
                      <span className="text-body-md font-bold text-foreground md:text-body-lg">{item.nft.name}</span>
                      <span className="text-caption text-secondary md:text-body">ID do token: {item.nft.tokenId}</span>
                    </div>
                  </div>
                </th>
                <td className="px-2 pt-3 text-center text-body leading-4 whitespace-nowrap text-foreground md:px-4">(x {item.quantity})</td>
                <td className="pt-3 text-right text-body-lg leading-4 font-bold whitespace-nowrap text-text-accent md:text-lead">
                  {formatEthLabel(item.lineTotalWei)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-5 flex flex-col gap-3 border-b-[0.3px] border-primary pb-3 text-body-lg leading-5 text-foreground md:pl-[169px] md:text-lead">
          {order.coupon && (
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-body-md">Desconto ({order.coupon.code})</dt>
              <dd className="whitespace-nowrap">(-) {formatEthLabel(order.totals.discountWei)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-body-md">Taxa de rede</dt>
            <dd className="whitespace-nowrap">{formatEthLabel(order.totals.networkFeeWei)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-2 font-bold">
            <dt className="text-body-md">Total</dt>
            <dd className="whitespace-nowrap text-text-accent">{formatEthLabel(order.totals.totalWei)}</dd>
          </div>
        </dl>

        <p className="mt-4 text-center text-body leading-[22px] text-text-secondary md:px-3">
          Transação confirmada na {NETWORK_LABELS[order.network]}. A propriedade foi transferida para sua carteira
          conectada e registrada na rede.
        </p>
        <a
          href={explorer.txUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ size: 'none' }), 'mt-5 h-12 self-center rounded-md px-4 text-body-lg leading-5 font-bold')}
        >
          Ver no {explorer.label}
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      </div>
    </div>
  )
}
