import { z } from 'zod'
import { networkSchema, type Network } from '@/entities/nft'

/** Provedores de carteira do Figma (MetaMask · WalletConnect · Coinbase Wallet). */
export const WALLET_PROVIDERS = ['metamask', 'walletconnect', 'coinbase'] as const
export const walletProviderSchema = z.enum(WALLET_PROVIDERS, { error: 'Selecione uma carteira' })
export type WalletProvider = z.infer<typeof walletProviderSchema>

export const WALLET_PROVIDER_LABELS: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

/** Endereço válido para a rede: 0x + 40 hex (Ethereum/Polygon) ou base58 (Solana). */
export function isWalletAddress(address: string, network: Network): boolean {
  return network === 'solana' ? SOLANA_ADDRESS.test(address) : EVM_ADDRESS.test(address)
}

/** Mensagem do endereço inválido para a rede (formulários e handlers). */
export function walletAddressError(network: Network): string {
  return network === 'solana' ? 'Endereço Solana inválido' : 'Endereço 0x inválido (0x + 40 caracteres)'
}

/** Nome ENS: rótulos de letras, números e hífen; o sufixo ".eth" é opcional na digitação. */
export const ENS_NAME_PATTERN = /^[a-z0-9-]{3,}(\.[a-z0-9-]+)*(\.eth)?$/i

/** "ana" → "ana.eth"; nomes que já terminam em ".eth" ficam como estão (sempre em minúsculas). */
export function normalizeEnsName(value: string): string {
  const lower = value.trim().toLowerCase()
  return lower.endsWith('.eth') ? lower : `${lower}.eth`
}

/** Mesmo endereço (EVM sem diferenciar maiúsculas; Solana exato). */
export function sameWalletAddress(a: string, b: string, network: Network): boolean {
  return network === 'solana' ? a === b : a.toLowerCase() === b.toLowerCase()
}

/** "0xA91F3c…E82C" → "0xA91F…E82C" (exibição, como no Figma mobile). */
export function shortAddress(address: string): string {
  return address.length <= 12 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`
}

/**
 * Carteira salva do usuário (`/me/wallets`, CRUD na Fase 7). Usada no checkout (D-08) para
 * pré-preencher o colecionador e definir a rede do pedido. Opcionais chegam como `null`.
 * Campos do formulário "Carteiras" do Figma (`d-09`): nome de exibição, apelido, rede, nome do
 * perfil, endereço, ENS ou carteira secundária, tipo, código de indicação, e-mail e nome ENS.
 * Sempre há exatamente uma `primary` quando o usuário tem carteiras.
 */
export const walletSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['primary', 'secondary']),
  /** Nome do cartão no checkout mobile ("Principal", "Reserva"). */
  label: z.string(),
  /** "Apelido da carteira". */
  nickname: z.string(),
  /** "Nome de exibição" do colecionador nessa carteira. */
  displayName: z.string(),
  /** "Nome do perfil". */
  profileName: z.string(),
  provider: walletProviderSchema,
  network: networkSchema,
  address: z.string().min(1),
  ensName: z.string().nullable(),
  /** "ENS ou carteira secundária (opcional)". */
  secondaryWallet: z.string().nullable(),
  referralCode: z.string().nullable(),
  email: z.string().nullable(),
})
export type Wallet = z.infer<typeof walletSchema>

/** Lista de `GET /me/wallets` e `POST /me/wallets/:id/primary`: a principal primeiro. */
export const walletListSchema = z.array(walletSchema)
