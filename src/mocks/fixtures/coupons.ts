import type { Network } from '@/entities/nft'
import { parseEth } from '@/lib/money'

export type CouponFixture = {
  code: string
  kind: 'percent' | 'fixed'
  bps?: number
  amountWei?: string
  minSubtotalWei?: string
  expiresAt?: string
}

/** Cupons do servidor simulado (data-model.md → Fixtures). */
export const COUPONS: CouponFixture[] = [
  { code: 'KURIO10', kind: 'percent', bps: 1_000 },
  { code: 'LANCAMENTO', kind: 'fixed', amountWei: parseEth('0.05').toString(), minSubtotalWei: parseEth('1').toString() },
  { code: 'EXPIRADO', kind: 'percent', bps: 2_000, expiresAt: '2025-01-01T00:00:00.000Z' },
]

/** Taxa de rede (gas estimado) cobrada uma vez por rede presente no carrinho. */
export const NETWORK_FEES_WEI: Record<Network, string> = {
  ethereum: parseEth('0.0025').toString(),
  polygon: parseEth('0.0004').toString(),
  solana: parseEth('0.0001').toString(),
}
