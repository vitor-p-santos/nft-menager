import { http, HttpResponse } from 'msw'
import { addToCartInputSchema, couponInputSchema, mergeCartInputSchema, updateCartItemInputSchema } from '@/entities/cart'
import { API_BASE_URL } from '@/lib/api'
import { cartsTable, type CartOwner, type CartRow } from '../db/carts'
import { nftsTable } from '../db/catalog'
import { resolveSession, sessionExpiredResponse } from '../db/session'
import { cartSubtotal, mergeAnonymousCart, toCart } from '../domain/cart'
import { availableOf, findCoupon, isCouponExpired } from '../domain/pricing'
import { apiError, notFound, readJson, validationError } from '../http'
import { withScenario } from '../scenarios'
import { withAuth } from '../with-auth'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const missingCartId = () => apiError(400, 'validation_error', 'Cabeçalho X-Cart-Id ausente ou inválido')

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

function outOfStock(available: number) {
  return apiError(409, 'out_of_stock', available === 0 ? 'Edição esgotada' : `Só há ${available} disponíveis`, { available })
}

/** Erros de corpo do carrinho: com duas mensagens para o mesmo campo vale a última (contrato atual). */
const validation = (issues: readonly { path: readonly PropertyKey[]; message: string }[]) =>
  validationError(issues, { keep: 'last' })

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
      if (!nft) return notFound('NFT não encontrado')
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
      if (!row) return notFound('Item não encontrado no carrinho')
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
      if (!cart.items.some((i) => i.id === params.itemId)) return notFound('Item não encontrado no carrinho')
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
      if (!coupon) return apiError(422, 'coupon_invalid', 'Cupom inválido', { field: 'code' })
      if (isCouponExpired(coupon)) return apiError(422, 'coupon_expired', 'Este cupom expirou', { field: 'code' })
      const cart = cartsTable.get(owner)
      if (coupon.minSubtotalWei && cartSubtotal(cart) < BigInt(coupon.minSubtotalWei)) {
        return apiError(422, 'coupon_invalid', 'Subtotal abaixo do mínimo para este cupom', {
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
    withScenario(
      'cart.merge',
      withAuth(async ({ request }, { user }) => {
        const parsed = mergeCartInputSchema.safeParse(await readJson(request))
        if (!parsed.success) return validation(parsed.error.issues)
        return HttpResponse.json(toCart(mergeAnonymousCart(parsed.data.anonymousCartId, user.id)))
      }),
    ),
  ),
]
