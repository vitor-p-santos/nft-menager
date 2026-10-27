import type { Wallet } from '@/entities/wallet'

/** Linha do banco: `userId` e `createdAt` não saem na API (`createdAt` desempata a promoção da principal). */
export type WalletFixture = Wallet & { userId: string; createdAt: string }

/**
 * Carteiras salvas (data-model.md → Fixtures). Ana tem as duas do checkout mobile (`m-04-pagamento`):
 * "Reserva" (nova.kurio.eth, Polygon) e "Principal" (0xA91F…E82C, Ethereum). Bruno não tem carteiras.
 */
export const WALLETS: WalletFixture[] = [
  {
    id: 'wallet-ana-principal',
    userId: 'user-ana',
    role: 'primary',
    label: 'Principal',
    nickname: 'Ana Principal',
    displayName: 'Ana Ribeiro',
    profileName: 'ana',
    provider: 'metamask',
    network: 'ethereum',
    address: '0xA91F3c5D7e2B4a6F8091bC3dE4f5a6B7c8d9E82C',
    ensName: 'ana.eth',
    secondaryWallet: null,
    referralCode: null,
    email: 'ana@kurio.dev',
    createdAt: '2026-01-15T12:05:00.000Z',
  },
  {
    id: 'wallet-ana-reserva',
    userId: 'user-ana',
    role: 'secondary',
    label: 'Reserva',
    nickname: 'Ana Reserva',
    displayName: 'Ana Ribeiro',
    profileName: 'ana',
    provider: 'coinbase',
    network: 'polygon',
    address: '0x4b7Ee21C9a0D5f3E8c6B1a2D4e7F9c0B3a5d17F0',
    ensName: 'nova.kurio.eth',
    secondaryWallet: null,
    referralCode: null,
    email: 'ana@kurio.dev',
    createdAt: '2026-03-02T15:30:00.000Z',
  },
]
