import type { AppliedCoupon, Totals } from '@/entities/cart'
import type { Nft } from '@/entities/nft'
import { multiplyWei, percentOfWei } from '@/lib/money'
import { COUPONS, NETWORK_FEES_WEI, type CouponFixture } from '../fixtures/coupons'

/** Unidades disponíveis de uma edição (0 se o NFT ou a edição não existem). */
export const availableOf = (nft: Nft | undefined, edition: string) =>
  nft?.editions.find((e) => e.edition === edition)?.available ?? 0

export function findCoupon(code: string): CouponFixture | undefined {
  return COUPONS.find((c) => c.code === code.toUpperCase())
}

export const isCouponExpired = (c: CouponFixture, now = Date.now()) =>
  c.expiresAt !== undefined && Date.parse(c.expiresAt) <= now

function discountFor(coupon: CouponFixture, subtotal: bigint): { eligible: boolean; discount: bigint } {
  if (isCouponExpired(coupon)) return { eligible: false, discount: 0n }
  if (coupon.minSubtotalWei && subtotal < BigInt(coupon.minSubtotalWei)) return { eligible: false, discount: 0n }
  const raw = coupon.kind === 'percent' ? percentOfWei(subtotal, coupon.bps ?? 0) : BigInt(coupon.amountWei ?? '0')
  return { eligible: true, discount: raw > subtotal ? subtotal : raw }
}

export type PricedLine = { priceWei: string; quantity: number; network: Nft['network'] }

/**
 * Totais do contrato para um conjunto de linhas: subtotal − desconto do cupom + uma taxa por rede
 * presente (linhas com quantidade 0 não contam). Usado pelo carrinho e pela revalidação do checkout.
 */
export function priceLines(lines: PricedLine[], couponCode: string | null): { totals: Totals; coupon: AppliedCoupon | null } {
  const networks = new Set<Nft['network']>()
  let subtotal = 0n
  for (const line of lines) {
    if (line.quantity <= 0) continue
    subtotal += multiplyWei(BigInt(line.priceWei), line.quantity)
    networks.add(line.network)
  }
  const coupon = couponCode ? findCoupon(couponCode) : undefined
  const { eligible, discount } = coupon ? discountFor(coupon, subtotal) : { eligible: false, discount: 0n }
  const fee = [...networks].reduce((acc, n) => acc + BigInt(NETWORK_FEES_WEI[n]), 0n)
  return {
    coupon: coupon
      ? {
          code: coupon.code,
          kind: coupon.kind,
          bps: coupon.bps ?? null,
          amountWei: coupon.amountWei ?? null,
          minSubtotalWei: coupon.minSubtotalWei ?? null,
          eligible,
        }
      : null,
    totals: {
      subtotalWei: subtotal.toString(),
      discountWei: discount.toString(),
      networkFeeWei: fee.toString(),
      totalWei: (subtotal - discount + fee).toString(),
    },
  }
}
