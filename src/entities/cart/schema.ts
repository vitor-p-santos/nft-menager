import { z } from 'zod'
import { editionSchema, imageSchema, networkSchema, weiSchema } from '@/entities/nft'

/** Totais calculados pelo servidor: total = subtotal − desconto + taxa de rede (wei). */
export const totalsSchema = z.object({
  subtotalWei: weiSchema,
  discountWei: weiSchema,
  networkFeeWei: weiSchema,
  totalWei: weiSchema,
})
export type Totals = z.infer<typeof totalsSchema>

/**
 * Sinalização do servidor ao comparar o item com o NFT atual:
 * `price_changed` (preço atual ≠ `unitPriceWei` da adição), `unavailable` (edição esgotada)
 * e `quantity_reduced` (estoque menor que a quantidade pedida; `quantity` já vem limitada).
 */
export const cartItemIssueSchema = z.enum(['price_changed', 'unavailable', 'quantity_reduced'])
export type CartItemIssue = z.infer<typeof cartItemIssueSchema>

export const cartItemSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  edition: editionSchema,
  quantity: z.number().int().nonnegative(),
  /** Preço unitário no momento da adição. */
  unitPriceWei: weiSchema,
  /** Preço unitário atual do NFT (usado no subtotal). */
  currentPriceWei: weiSchema,
  /** Quantidade × preço atual (0 se indisponível). */
  lineTotalWei: weiSchema,
  /** `editions[].available` atual: limite da quantidade. */
  available: z.number().int().nonnegative(),
  issue: cartItemIssueSchema.nullable(),
  /** Dados de exibição do NFT (estado atual). */
  nft: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    tokenId: z.string(),
    collection: z.string(),
    network: networkSchema,
    image: imageSchema,
  }),
})
export type CartItem = z.infer<typeof cartItemSchema>

export const appliedCouponSchema = z.object({
  code: z.string(),
  kind: z.enum(['percent', 'fixed']),
  bps: z.number().int().positive().nullable(),
  amountWei: weiSchema.nullable(),
  minSubtotalWei: weiSchema.nullable(),
  /** false quando o subtotal caiu abaixo do mínimo depois de aplicado (desconto = 0). */
  eligible: z.boolean(),
})
export type AppliedCoupon = z.infer<typeof appliedCouponSchema>

export const cartSchema = z.object({
  id: z.string(),
  items: z.array(cartItemSchema),
  coupon: appliedCouponSchema.nullable(),
  totals: totalsSchema,
  /** Quantidade total de unidades (badge do carrinho). */
  itemCount: z.number().int().nonnegative(),
  version: z.number().int().nonnegative(),
})
export type Cart = z.infer<typeof cartSchema>

export const addToCartInputSchema = z.object({
  nftId: z.string().min(1),
  edition: editionSchema,
  quantity: z.number().int().min(1, 'Quantidade mínima é 1'),
})
export type AddToCartInput = z.infer<typeof addToCartInputSchema>

export const updateCartItemInputSchema = z.object({
  quantity: z.number().int().min(1, 'Quantidade mínima é 1'),
})

export const couponInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Informe o código do cupom')
    .max(32, 'Código muito longo')
    .transform((v) => v.toUpperCase()),
})
export type CouponInput = z.input<typeof couponInputSchema>

export const mergeCartInputSchema = z.object({ anonymousCartId: z.string().min(1) })
