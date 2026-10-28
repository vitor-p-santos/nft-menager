import { z } from 'zod'
import { appliedCouponSchema, cartItemSchema, networkMismatchMessage, totalsSchema } from '@/entities/cart'
import { editionSchema, networkSchema, weiSchema, type Network } from '@/entities/nft'
import type { User } from '@/entities/session'
import { isWalletAddress, walletProviderSchema, type Wallet } from '@/entities/wallet'

/**
 * Schemas do checkout (contracts/rest-api.md → Checkout e pedidos). Os mesmos schemas validam o
 * formulário (RHF + zodResolver), o corpo no handler MSW e as respostas no client.
 */

/** Texto opcional: '' / null / ausente → `null`. Aceita `null` porque o handler revalida o payload já transformado. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .nullable()
    .optional()
    .transform((value) => (value ? value : null))

const ENS_NAME = /^[a-z0-9-]{3,}(\.[a-z0-9-]+)*(\.eth)?$/i

/**
 * "Perfil do colecionador" (D-08). O desktop edita no formulário; o mobile monta o mesmo payload a
 * partir do perfil + carteira (`collectorDefaults`). A rede vem da carteira (US-05).
 * `ensName` e `referralCode` são opcionais (ver ARCHITECTURE.md → Checkout: dados).
 */
export const collectorSchema = z
  .object({
    displayName: z.string().trim().min(2, 'Informe o nome de exibição').max(50, 'Use até 50 caracteres'),
    username: z
      .string()
      .trim()
      .min(3, 'Informe o nome de usuário')
      .max(30, 'Use até 30 caracteres')
      .regex(/^[a-z0-9_.]+$/i, 'Use letras, números, ponto ou sublinhado'),
    network: z.enum(networkSchema.options, { error: 'Selecione uma rede' }),
    profileName: z.string().trim().min(2, 'Informe o nome do perfil').max(50, 'Use até 50 caracteres'),
    walletAddress: z.string().trim().min(1, 'Informe o endereço da carteira'),
    /** "ENS ou carteira secundária (opcional)". */
    secondaryWallet: optionalText(100, 'Use até 100 caracteres'),
    walletProvider: walletProviderSchema,
    referralCode: optionalText(32, 'Use até 32 caracteres'),
    email: z.string().trim().toLowerCase().pipe(z.email('Informe um e-mail válido')),
    /** Sem o sufixo, o servidor e o client acrescentam ".eth". */
    ensName: optionalText(64, 'Use até 64 caracteres')
      .refine((v) => v === null || ENS_NAME.test(v), 'Nome ENS inválido')
      .transform((v) => (v === null || v.toLowerCase().endsWith('.eth') ? v : `${v}.eth`)),
    note: optionalText(500, 'Use até 500 caracteres'),
  })
  .superRefine((value, ctx) => {
    if (value.walletAddress && !isWalletAddress(value.walletAddress, value.network)) {
      ctx.addIssue({
        code: 'custom',
        path: ['walletAddress'],
        message: value.network === 'solana' ? 'Endereço Solana inválido' : 'Endereço 0x inválido (0x + 40 caracteres)',
      })
    }
    const secondary = value.secondaryWallet
    if (secondary && !ENS_NAME.test(secondary) && !isWalletAddress(secondary, value.network)) {
      ctx.addIssue({ code: 'custom', path: ['secondaryWallet'], message: 'Informe um nome ENS ou um endereço válido' })
    }
  })

/**
 * O colecionador de um pedido cujos NFTs são da rede `network`: a carteira (salva ou digitada) tem de
 * ser dessa rede. A API recusa a divergência com 422 no campo `network`.
 */
export const collectorSchemaFor = (network: Network) =>
  collectorSchema.superRefine((value, ctx) => {
    if (value.network && value.network !== network) {
      ctx.addIssue({ code: 'custom', path: ['network'], message: networkMismatchMessage(network) })
    }
  })

/** Tipo do formulário (entrada do resolver). */
export type CollectorFormValues = z.input<typeof collectorSchema>
/** Payload normalizado (saída do schema) enviado em `POST /orders`. */
export type CollectorInput = z.output<typeof collectorSchema>

/**
 * Valores iniciais do colecionador (D-08): perfil do usuário + carteira escolhida (normalmente a
 * principal). Sem carteira, rede/endereço/tipo ficam vazios para o usuário preencher.
 */
export function collectorDefaults(user: User, wallet: Wallet | null): CollectorFormValues {
  return {
    displayName: user.displayName,
    username: user.username,
    profileName: wallet?.nickname || user.displayName,
    email: wallet?.email ?? user.email,
    ensName: wallet?.ensName ?? user.ensName ?? '',
    referralCode: wallet?.referralCode ?? '',
    secondaryWallet: '',
    note: '',
    walletAddress: wallet?.address ?? '',
    // Sem carteira o select começa em "Selecione…": o resolver acusa o campo vazio.
    network: wallet?.network as CollectorFormValues['network'],
    walletProvider: wallet?.provider as CollectorFormValues['walletProvider'],
  }
}

// ── Cotação (POST /checkout/quote) ─────────────────────────────────────────────

export const quoteRequestSchema = z.object({ cartVersion: z.number().int().nonnegative() })
export type QuoteRequest = z.infer<typeof quoteRequestSchema>

const changedItem = {
  itemId: z.string(),
  nftId: z.string(),
  name: z.string(),
  edition: editionSchema,
}

/**
 * O que a revalidação ajustou no carrinho desde a última vez que o usuário o viu. A cotação já vem
 * com os valores novos (o carrinho é atualizado no servidor); a UI mostra a diferença e pede nova
 * confirmação. Uma segunda cotação sem mudanças vem com `changes: []`.
 */
export const quoteChangeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('price_changed'), ...changedItem, fromWei: weiSchema, toWei: weiSchema }),
  z.object({
    type: z.literal('quantity_reduced'),
    ...changedItem,
    fromQuantity: z.number().int().positive(),
    toQuantity: z.number().int().positive(),
  }),
  /** Esgotou: o item saiu do carrinho. */
  z.object({ type: z.literal('unavailable'), ...changedItem, fromQuantity: z.number().int().positive() }),
  /** Cupom expirado: removido do carrinho. */
  z.object({ type: z.literal('coupon_removed'), code: z.string(), reason: z.literal('expired') }),
  /** O subtotal caiu abaixo do mínimo: o cupom continua aplicado, mas sem desconto. */
  z.object({ type: z.literal('coupon_ineligible'), code: z.string(), minSubtotalWei: weiSchema }),
  /** O carrinho foi alterado em outro lugar (outra aba) depois da versão que a tela tinha. */
  z.object({ type: z.literal('cart_updated'), fromVersion: z.number().int(), toVersion: z.number().int() }),
  z.object({ type: z.literal('totals_changed'), from: totalsSchema, to: totalsSchema }),
])
export type QuoteChange = z.infer<typeof quoteChangeSchema>

export const quoteSchema = z.object({
  id: z.string(),
  /** Versão do carrinho já revalidado. `POST /orders` falha com 409 se ela mudar. */
  cartVersion: z.number().int().nonnegative(),
  /** Itens compráveis (quantidade > 0), todos com `issue: null`. */
  items: z.array(cartItemSchema).min(1),
  coupon: appliedCouponSchema.nullable(),
  totals: totalsSchema,
  changes: z.array(quoteChangeSchema),
  expiresAt: z.iso.datetime(),
})
export type Quote = z.infer<typeof quoteSchema>

// ── Pedido (POST /orders) ──────────────────────────────────────────────────────

/**
 * Corpo de `POST /orders` (+ header `Idempotency-Key`). `walletId` = carteira salva (a rede e o
 * endereço precisam bater com ela); `null` = carteira digitada no formulário.
 */
export const createOrderInputSchema = z
  .object({
    quoteId: z.string().min(1),
    walletId: z.string().min(1).nullable(),
    network: networkSchema,
    collector: collectorSchema,
  })
  .refine((v) => v.network === v.collector.network, {
    path: ['network'],
    message: 'A rede do pedido deve ser a rede da carteira',
  })
export type CreateOrderInput = z.input<typeof createOrderInputSchema>
export type CreateOrderPayload = z.output<typeof createOrderInputSchema>

/** `details` dos 409 do checkout: o que mudou desde a cotação (refaça a cotação e confirme de novo). */
export const checkoutConflictDetailsSchema = z.object({ changes: z.array(quoteChangeSchema) })
