import { z } from 'zod'
import { networkSchema } from '@/entities/nft'
import { displayNameSchema, emailSchema, type User } from '@/entities/session'
import { ENS_NAME_PATTERN, isWalletAddress, walletAddressError, walletProviderSchema, type Wallet } from '@/entities/wallet'
import { optionalEnsNameSchema, optionalText } from './text'

/**
 * Formulário "Carteiras" (Figma `d-09`) e corpos de `POST /me/wallets` e `PATCH /me/wallets/:id`.
 * Os mesmos schemas validam o formulário, o handler MSW (o PATCH é parcial: o servidor junta o corpo
 * com a carteira atual e valida o resultado) e a resposta (`walletSchema` em `entities/wallet`).
 * `referralCode` e `ensName` são opcionais, como no checkout (ARCHITECTURE.md → Checkout: dados).
 */
export const MAX_WALLETS = 10

const walletFields = z.object({
  /** Nome do cartão no checkout ("Principal", "Reserva"); vazio → usa o apelido. Não está no Figma. */
  label: optionalText(30),
  nickname: z.string().trim().min(2, 'Informe o apelido da carteira').max(40, 'Use até 40 caracteres'),
  displayName: displayNameSchema,
  profileName: z.string().trim().min(2, 'Informe o nome do perfil').max(50, 'Use até 50 caracteres'),
  network: z.enum(networkSchema.options, { error: 'Selecione uma rede' }),
  provider: walletProviderSchema,
  address: z.string().trim().min(1, 'Informe o endereço da carteira'),
  secondaryWallet: optionalText(100),
  referralCode: optionalText(32),
  email: emailSchema,
  ensName: optionalEnsNameSchema,
})

type WalletFieldsOutput = z.output<typeof walletFields>

function checkAddresses(value: WalletFieldsOutput, ctx: z.RefinementCtx) {
  if (value.address && !isWalletAddress(value.address, value.network)) {
    ctx.addIssue({ code: 'custom', path: ['address'], message: walletAddressError(value.network) })
  }
  const secondary = value.secondaryWallet
  if (secondary && !ENS_NAME_PATTERN.test(secondary) && !isWalletAddress(secondary, value.network)) {
    ctx.addIssue({ code: 'custom', path: ['secondaryWallet'], message: 'Informe um nome ENS ou um endereço válido' })
  }
}

/** Formulário e `PATCH /me/wallets/:id` (após a junção com a carteira atual). */
export const walletInputSchema = walletFields.superRefine(checkAddresses)
export type WalletFormValues = z.input<typeof walletInputSchema>
export type WalletInput = z.output<typeof walletInputSchema>

/** `POST /me/wallets`: `makePrimary` torna a nova carteira a principal (a 1ª carteira sempre é). */
export const createWalletRequestSchema = walletFields
  .extend({ makePrimary: z.boolean().optional().default(false) })
  .superRefine(checkAddresses)
export type CreateWalletRequest = z.input<typeof createWalletRequestSchema>

/** `PATCH /me/wallets/:id`: qualquer subconjunto dos campos (o papel muda só por `/primary`). */
export type UpdateWalletRequest = Partial<WalletFormValues>

/** Carteira salva → valores do formulário (opcionais `null` viram ''). */
export function walletToFormValues(wallet: Wallet): WalletFormValues {
  return {
    label: wallet.label,
    nickname: wallet.nickname,
    displayName: wallet.displayName,
    profileName: wallet.profileName,
    network: wallet.network,
    provider: wallet.provider,
    address: wallet.address,
    secondaryWallet: wallet.secondaryWallet ?? '',
    referralCode: wallet.referralCode ?? '',
    email: wallet.email ?? '',
    ensName: wallet.ensName ?? '',
  }
}

/** Formulário de uma carteira nova, pré-preenchido com o perfil. Rede e tipo começam em "Selecione…". */
export function newWalletFormDefaults(user: User): WalletFormValues {
  return {
    label: '',
    nickname: '',
    displayName: user.displayName,
    profileName: user.username,
    network: undefined as unknown as WalletFormValues['network'],
    provider: undefined as unknown as WalletFormValues['provider'],
    address: '',
    secondaryWallet: '',
    referralCode: '',
    email: user.email,
    ensName: user.ensName ?? '',
  }
}
