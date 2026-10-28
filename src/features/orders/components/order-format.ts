import type { Order } from '@/entities/order'

/** Referência curta do pedido ("#A91FE82C"): os 8 últimos caracteres do id, em maiúsculas. */
export function orderRef(id: string) {
  return `#${id.replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase()}`
}

/** "Emerald Ape #042" ou "Emerald Ape #042 + 2 NFTs". */
export function orderTitle(order: Order) {
  const [first] = order.items
  const others = order.items.length - 1
  return others > 0 ? `${first?.nft.name ?? ''} + ${others} ${others === 1 ? 'NFT' : 'NFTs'}` : (first?.nft.name ?? '')
}

/** Ação de cada pedido: o recibo quando confirmado; senão, a página com o estado atual. */
export function actionLabel(order: Order) {
  return order.status === 'confirmed' ? 'Ver recibo' : 'Ver pedido'
}
