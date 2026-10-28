import { NETWORK_LABELS, type Network } from '@/entities/nft'
import type { CartItem } from './schema'

/**
 * Cada pedido é pago numa rede só: a rede dos NFTs comprados (a carteira tem de ser dessa rede).
 * Um carrinho com NFTs de redes diferentes é finalizado uma rede por vez. Regra compartilhada pelo
 * carrinho, pelo checkout e pela API simulada.
 */

/** Redes dos itens compráveis (os indisponíveis saem na revalidação), na ordem do carrinho. */
export function cartNetworks(items: readonly Pick<CartItem, 'issue' | 'nft'>[]): Network[] {
  const networks = new Set<Network>()
  for (const item of items) if (item.issue !== 'unavailable') networks.add(item.nft.network)
  return [...networks]
}

const listLabels = (networks: readonly Network[]) => {
  const labels = networks.map((n) => NETWORK_LABELS[n])
  return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} e ${labels.at(-1)}` : (labels[0] ?? '')
}

export const mixedNetworksMessage = (networks: readonly Network[]) =>
  `Seu carrinho tem NFTs de ${listLabels(networks)}. Cada compra usa uma rede só: remova os itens das outras redes para finalizar.`

export const networkMismatchMessage = (network: Network) =>
  `Os NFTs deste pedido são da rede ${NETWORK_LABELS[network]}. Use uma carteira ${NETWORK_LABELS[network]}.`
