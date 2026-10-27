import { http, HttpResponse } from 'msw'
import {
  addToCartInputSchema,
  couponInputSchema,
  mergeCartInputSchema,
  updateCartItemInputSchema,
  type AppliedCoupon,
  type Cart,
  type CartItem,
  type Totals,
} from '@/entities/cart'
import type { Nft } from '@/entities/nft'
import { API_BASE_URL } from '@/lib/api'
import { multiplyWei, percentOfWei } from '@/lib/money'
import { cartsTable, type CartOwner, type CartRow, type StoredCart } from '../db/carts'
import { nftsTable } from '../db/catalog'
import { authenticate, resolveSession, sessionExpiredResponse } from '../db/session'
import { COUPONS, NETWORK_FEES_WEI, type CouponFixture } from '../fixtures/coupons'
import { withScenario } from '../scenarios'

const error = (status: number, code: string, message: string, details?: Record<string, unknown>) =>
  HttpResponse.json({ code, message, ...(details ? { details } : {}) }, { status })

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const missingCartId = () => error(400, 'validation_error', 'Cabeçalho X-Cart-Id ausente ou inválido')

/**
 * Com sessão usa o carrinho do usuário; sem sessão exige `X-Cart-Id` (uuid).
 * Token enviado mas vencido → 401 `session_expired` (não cai silenciosamente no carrinho anônimo).
 */
function resolveOwner(request: Request): CartOwner | Response {
  const session = resolveSession(request)
  if (session.status === 'valid') return { userId: session.user.id }
  if (session.status === 'expired') return sessionExpiredResponse()
  const id = request.headers.get('X-Cart-Id')
  return id && UUID.test(id) ? { anonymousId: id } : missingCartId()
}

export const availableOf = (nft: Nft | undefined, edition: string) =>
  nft?.editions.find((e) => e.edition === edition)?.available ?? 0

export function findCoupon(code: string): CouponFixture | undefined {
  return COUPONS.find((c) => c.code === code.toUpperCase())
}
export const isExpired = (c: CouponFixture, now = Date.now()) => c.expiresAt !== undefined && Date.parse(c.expiresAt) <= now

function discountFor(coupon: CouponFixture, subtotal: bigint): { eligible: boolean; discount: bigint } {
  if (isExpired(coupon)) return { eligible: false, discount: 0n }
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

/** Monta o `Cart` do contrato: compara cada item com o NFT atual e recalcula os totais. */
export function toCart(stored: StoredCart): Cart {
  const items: CartItem[] = []
  for (const row of stored.items) {
    const nft = nftsTable.find(row.nftId)
    if (!nft) continue
    const available = availableOf(nft, row.edition)
    const quantity = Math.min(row.quantity, available)
    const issue: CartItem['issue'] =
      available === 0
        ? 'unavailable'
        : quantity < row.quantity
          ? 'quantity_reduced'
          : nft.priceWei !== row.unitPriceWei
            ? 'price_changed'
            : null
    const line = multiplyWei(BigInt(nft.priceWei), quantity)
    const { id, slug, name, tokenId, collection, network, image } = nft
    items.push({
      id: row.id,
      nftId: row.nftId,
      edition: row.edition,
      quantity,
      unitPriceWei: row.unitPriceWei,
      currentPriceWei: nft.priceWei,
      lineTotalWei: line.toString(),
      available,
      issue,
      nft: { id, slug, name, tokenId, collection, network, image },
    })
  }
  const { totals, coupon } = priceLines(
    items.map((i) => ({ priceWei: i.currentPriceWei, quantity: i.quantity, network: i.nft.network })),
    stored.couponCode,
  )
  return {
    id: stored.id,
    items,
    coupon,
    totals,
    itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
    version: stored.version,
  }
}

const subtotalOf = (stored: StoredCart) => BigInt(toCart(stored).totals.subtotalWei)

function outOfStock(available: number) {
  return error(409, 'out_of_stock', available === 0 ? 'Edição esgotada' : `Só há ${available} disponíveis`, { available })
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function validation(issues: { path: PropertyKey[]; message: string }[]) {
  const fields = Object.fromEntries(issues.map((i) => [i.path.map(String).join('.') || '_', i.message]))
  return error(422, 'validation_error', 'Dados inválidos', fields)
}

export const cartHandlers = [
  http.get(
    `${API_BASE_URL}/cart`,
    withScenario('cart.get', ({ request }) => {
      const owner = resolveOwner(request)
      if (owner instanceof Response) return owner
      return HttpResponse.json(toCart(cartsTable.get(owner)))
    }),
  ),

  http.post(
    `${API_BASE_URL}/cart/items`,
    withScenario('cart.add', async ({ request }) => {
      const owner = resolveOwner(request)
      if (owner instanceof Response) return owner
      const parsed = addToCartInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validation(parsed.error.issues)
      const { nftId, edition, quantity } = parsed.data
      const nft = nftsTable.find(nftId)
      if (!nft) return error(404, 'not_found', 'NFT não encontrado')
      if (!nft.editions.some((e) => e.edition === edition)) {
        return validation([{ path: ['edition'], message: 'Edição indisponível para este NFT' }])
      }
      const cart = cartsTable.get(owner)
      const existing = cart.items.find((i) => i.nftId === nft.id && i.edition === edition)
      const available = availableOf(nft, edition)
      if ((existing?.quantity ?? 0) + quantity > available) return outOfStock(available)
      const items: CartRow[] = existing
        ? cart.items.map((i) => (i === existing ? { ...i, quantity: i.quantity + quantity, unitPriceWei: nft.priceWei } : i))
        : [
            ...cart.items,
            { id: crypto.randomUUID(), nftId: nft.id, edition, quantity, unitPriceWei: nft.priceWei, addedAt: new Date().toISOString() },
          ]
      return HttpResponse.json(toCart(cartsTable.save(owner, { ...cart, items })))
    }),
  ),

  http.patch(
    `${API_BASE_URL}/cart/items/:itemId`,
    withScenario('cart.update', async ({ request, params }) => {
      const owner = resolveOwner(request)
      if (owner instanceof Response) return owner
      const parsed = updateCartItemInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validation(parsed.error.issues)
      const cart = cartsTable.get(owner)
      const row = cart.items.find((i) => i.id === params.itemId)
      if (!row) return error(404, 'not_found', 'Item não encontrado no carrinho')
      const nft = nftsTable.find(row.nftId)
      const available = availableOf(nft, row.edition)
      if (parsed.data.quantity > available) return outOfStock(available)
      // Atualizar o item aceita o preço atual (limpa `price_changed`).
      const items = cart.items.map((i) =>
        i === row ? { ...i, quantity: parsed.data.quantity, unitPriceWei: nft?.priceWei ?? i.unitPriceWei } : i,
      )
      return HttpResponse.json(toCart(cartsTable.save(owner, { ...cart, items })))
    }),
  ),

  http.delete(
    `${API_BASE_URL}/cart/items/:itemId`,
    withScenario('cart.remove', ({ request, params }) => {
      const owner = resolveOwner(request)
      if (owner instanceof Response) return owner
      const cart = cartsTable.get(owner)
      if (!cart.items.some((i) => i.id === params.itemId)) return error(404, 'not_found', 'Item não encontrado no carrinho')
      const items = cart.items.filter((i) => i.id !== params.itemId)
      return HttpResponse.json(toCart(cartsTable.save(owner, { ...cart, items })))
    }),
  ),

  http.post(
    `${API_BASE_URL}/cart/coupon`,
    withScenario('cart.coupon', async ({ request }) => {
      const owner = resolveOwner(request)
      if (owner instanceof Response) return owner
      const parsed = couponInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validation(parsed.error.issues)
      const coupon = findCoupon(parsed.data.code)
      if (!coupon) return error(422, 'coupon_invalid', 'Cupom inválido', { field: 'code' })
      if (isExpired(coupon)) return error(422, 'coupon_expired', 'Este cupom expirou', { field: 'code' })
      const cart = cartsTable.get(owner)
      if (coupon.minSubtotalWei && subtotalOf(cart) < BigInt(coupon.minSubtotalWei)) {
        return error(422, 'coupon_invalid', 'Subtotal abaixo do mínimo para este cupom', {
          field: 'code',
          minSubtotalWei: coupon.minSubtotalWei,
        })
      }
      return HttpResponse.json(toCart(cartsTable.save(owner, { ...cart, couponCode: coupon.code })))
    }),
  ),

  http.delete(
    `${API_BASE_URL}/cart/coupon`,
    withScenario('cart.coupon', ({ request }) => {
      const owner = resolveOwner(request)
      if (owner instanceof Response) return owner
      const cart = cartsTable.get(owner)
      if (!cart.couponCode) return HttpResponse.json(toCart(cart))
      return HttpResponse.json(toCart(cartsTable.save(owner, { ...cart, couponCode: null })))
    }),
  ),

  /** Junta o carrinho anônimo ao do usuário (login, Fase 4). Quantidades limitadas ao estoque. */
  http.post(
    `${API_BASE_URL}/cart/merge`,
    withScenario('cart.merge', async ({ request }) => {
      const auth = authenticate(request)
      if (auth.error) return auth.error
      const { user } = auth
      const parsed = mergeCartInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validation(parsed.error.issues)
      const anonOwner: CartOwner = { anonymousId: parsed.data.anonymousCartId }
      const userOwner: CartOwner = { userId: user.id }
      const anon = cartsTable.get(anonOwner)
      const mine = cartsTable.get(userOwner)
      if (anon.items.length === 0 && !anon.couponCode) return HttpResponse.json(toCart(mine))
      const items = [...mine.items]
      for (const row of anon.items) {
        const max = availableOf(nftsTable.find(row.nftId), row.edition)
        const idx = items.findIndex((i) => i.nftId === row.nftId && i.edition === row.edition)
        if (idx >= 0) {
          const current = items[idx]!
          items[idx] = { ...current, quantity: Math.max(current.quantity, Math.min(current.quantity + row.quantity, max)) }
        } else {
          items.push(row)
        }
      }
      const merged = cartsTable.save(userOwner, { ...mine, items, couponCode: mine.couponCode ?? anon.couponCode })
      cartsTable.remove(anonOwner)
      return HttpResponse.json(toCart(merged))
    }),
  ),
]
