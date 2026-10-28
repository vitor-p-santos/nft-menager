import { EDITION_LABELS } from '@/entities/nft'
import { formatEthLabel } from '@/lib/money'
import type { QuoteChange } from '../schemas/checkout'

/** Uma linha legível por mudança da revalidação (`POST /checkout/quote` → `changes[]`). */
export function describeChange(change: QuoteChange): string {
  switch (change.type) {
    case 'price_changed':
      return `${change.name} (edição ${EDITION_LABELS[change.edition]}): preço de ${formatEthLabel(change.fromWei)} para ${formatEthLabel(change.toWei)}.`
    case 'quantity_reduced':
      return `${change.name} (edição ${EDITION_LABELS[change.edition]}): quantidade ajustada de ${change.fromQuantity} para ${change.toQuantity} por falta de estoque.`
    case 'unavailable':
      return `${change.name} (edição ${EDITION_LABELS[change.edition]}) esgotou e saiu do pedido.`
    case 'coupon_removed':
      return `O cupom ${change.code} expirou e foi removido.`
    case 'coupon_ineligible':
      return `O cupom ${change.code} ficou sem efeito: o subtotal mínimo é ${formatEthLabel(change.minSubtotalWei)}.`
    case 'cart_updated':
      return 'O carrinho foi alterado em outra aba ou dispositivo.'
    case 'totals_changed': {
      const parts = [`total de ${formatEthLabel(change.from.totalWei)} para ${formatEthLabel(change.to.totalWei)}`]
      if (change.from.networkFeeWei !== change.to.networkFeeWei) {
        parts.push(`taxa de rede de ${formatEthLabel(change.from.networkFeeWei)} para ${formatEthLabel(change.to.networkFeeWei)}`)
      }
      return `Valores atualizados: ${parts.join('; ')}.`
    }
  }
}
