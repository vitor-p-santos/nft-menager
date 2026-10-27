import type { Edition, Network } from './schema'

export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const EDITION_LABELS: Record<Edition, string> = {
  '1/1': '1/1',
  '1/10': '1/10',
  '1/50': '1/50',
  open: 'ABERTA',
}
