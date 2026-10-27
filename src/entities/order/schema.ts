import { z } from 'zod'
import { totalsSchema } from '@/entities/cart'
import { editionSchema, imageSchema, networkSchema, weiSchema } from '@/entities/nft'
import { walletProviderSchema } from '@/entities/wallet'

/** `pending` → `confirmed` | `rejected` (contracts/rest-api.md → Checkout e pedidos). */
export const ORDER_STATUSES = ['pending', 'confirmed', 'rejected'] as const
export const orderStatusSchema = z.enum(ORDER_STATUSES)
export type OrderStatus = z.infer<typeof orderStatusSchema>

export const isTerminalStatus = (status: OrderStatus) => status !== 'pending'

/** Motivo da recusa: carteira recusou o pagamento ou o estoque acabou antes da confirmação. */
export const rejectionCodeSchema = z.enum(['payment_declined', 'out_of_stock'])
export type RejectionCode = z.infer<typeof rejectionCodeSchema>

/** Item congelado no pedido: preço e dados do NFT no momento da cotação. */
export const orderItemSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  edition: editionSchema,
  quantity: z.number().int().positive(),
  unitPriceWei: weiSchema,
  lineTotalWei: weiSchema,
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
export type OrderItem = z.infer<typeof orderItemSchema>

/** Carteira usada no pagamento. `walletId` = carteira salva; `null` = informada no formulário. */
export const walletSnapshotSchema = z.object({
  walletId: z.string().nullable(),
  label: z.string().nullable(),
  provider: walletProviderSchema,
  network: networkSchema,
  address: z.string(),
  ensName: z.string().nullable(),
})
export type WalletSnapshot = z.infer<typeof walletSnapshotSchema>

/** Dados do colecionador enviados no checkout (D-08), como o servidor gravou. */
export const orderCollectorSchema = z.object({
  displayName: z.string(),
  username: z.string(),
  profileName: z.string(),
  email: z.string(),
  ensName: z.string().nullable(),
  secondaryWallet: z.string().nullable(),
  referralCode: z.string().nullable(),
  note: z.string().nullable(),
})
export type OrderCollector = z.infer<typeof orderCollectorSchema>

export const orderSchema = z.object({
  id: z.string(),
  idempotencyKey: z.string(),
  quoteId: z.string(),
  status: orderStatusSchema,
  items: z.array(orderItemSchema).min(1),
  coupon: z.object({ code: z.string(), discountWei: weiSchema }).nullable(),
  totals: totalsSchema,
  wallet: walletSnapshotSchema,
  network: networkSchema,
  collector: orderCollectorSchema,
  /** Só em `confirmed`. */
  txHash: z.string().nullable(),
  /** Só em `rejected`. */
  rejectionCode: rejectionCodeSchema.nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  /** Monotônica: 1 na criação, +1 a cada transição (acompanha `order.updated`). */
  version: z.number().int().positive(),
})
export type Order = z.infer<typeof orderSchema>

export const ORDERS_PAGE_SIZE = 10

const countSchema = z.number().int().nonnegative()

/** `GET /orders`: página filtrada + contagem por status (sem filtro), para as abas de "Atividade". */
export const orderListSchema = z.object({
  items: z.array(orderSchema),
  /** Total do filtro aplicado. */
  total: countSchema,
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: countSchema,
  counts: z.object({ all: countSchema, pending: countSchema, confirmed: countSchema, rejected: countSchema }),
})
export type OrderList = z.infer<typeof orderListSchema>

/**
 * Recibo imutável: gravado uma única vez na confirmação; `snapshot` nunca é reescrito e não acompanha
 * mudanças de preço/estoque do NFT. `.readonly()` impede no tipo que o client altere o recibo.
 */
export const receiptSchema = z
  .object({
    orderId: z.string(),
    issuedAt: z.iso.datetime(),
    snapshot: orderSchema,
  })
  .readonly()
export type Receipt = z.infer<typeof receiptSchema>

export const orderListFiltersSchema = z.object({
  status: orderStatusSchema.optional(),
  page: z.number().int().positive().optional(),
})
export type OrderListFilters = z.infer<typeof orderListFiltersSchema>
