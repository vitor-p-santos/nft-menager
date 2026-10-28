import type { Edition, Network, Nft } from '@/entities/nft'
import type { OrderCollector, OrderItem, OrderStatus, WalletSnapshot } from '@/entities/order'
import { multiplyWei, parseEth, percentOfWei } from '@/lib/money'
import type { OrderRow } from '../db/orders'
import { COUPONS, NETWORK_FEES_WEI } from './coupons'
import { seedNfts } from './nfts'
import { createRandom } from './random'
import { USERS } from './users'
import { WALLETS } from './wallets'

/**
 * Histórico de pedidos (data-model.md → Fixtures). Só a Ana tem pedidos; o Bruno (conta nova) começa
 * sem nenhum. Os preços são os da época da compra (`unitPriceWei`) e, de propósito, alguns diferem do
 * catálogo atual: o recibo mostra o valor pago, não o preço de hoje (recibo imutável).
 * - 10 `confirmed` com recibo (2 páginas de pedidos: 10 por página);
 * - 1 `rejected` (`payment_declined`), sem recibo;
 * - 1 `pending` com `outcome: 'hold'` (pagamento que nunca conclui), sem recibo.
 */
type Line = { slug: string; edition: Edition; quantity: number; price: string }
type Seed = {
  n: number
  status: OrderStatus
  createdAt: string
  walletId: string
  lines: Line[]
  coupon?: string
  note?: string
}

const ANA_SEEDS: Seed[] = [
  { n: 1, status: 'confirmed', createdAt: '2026-05-04T14:12:00.000Z', walletId: 'wallet-ana-reserva', lines: [{ slug: 'golden-signal-160', edition: '1/50', quantity: 1, price: '0.35' }] },
  { n: 2, status: 'confirmed', createdAt: '2026-05-21T19:40:00.000Z', walletId: 'wallet-ana-reserva', lines: [{ slug: 'neon-vessel-552', edition: '1/10', quantity: 1, price: '2.29' }] },
  { n: 3, status: 'confirmed', createdAt: '2026-06-09T10:05:00.000Z', walletId: 'wallet-ana-principal', coupon: 'KURIO10', lines: [{ slug: 'emerald-ape-042', edition: '1/50', quantity: 1, price: '1.09' }, { slug: 'golden-beat-207', edition: '1/50', quantity: 2, price: '0.99' }] },
  { n: 4, status: 'confirmed', createdAt: '2026-06-30T22:18:00.000Z', walletId: 'wallet-ana-reserva', lines: [{ slug: 'ivory-baron-088', edition: 'open', quantity: 1, price: '1.79' }] },
  { n: 5, status: 'confirmed', createdAt: '2026-07-17T08:47:00.000Z', walletId: 'wallet-ana-principal', lines: [{ slug: 'violet-nomad-314', edition: '1/50', quantity: 1, price: '1.39' }] },
  { n: 6, status: 'confirmed', createdAt: '2026-07-29T16:30:00.000Z', walletId: 'wallet-ana-principal', coupon: 'LANCAMENTO', note: 'Presente para o meu irmão.', lines: [{ slug: 'sage-nomad-009', edition: 'open', quantity: 1, price: '1.59' }] },
  { n: 7, status: 'confirmed', createdAt: '2026-08-12T13:02:00.000Z', walletId: 'wallet-ana-reserva', lines: [{ slug: 'golden-signal-160', edition: 'open', quantity: 3, price: '0.39' }] },
  { n: 8, status: 'confirmed', createdAt: '2026-08-28T20:55:00.000Z', walletId: 'wallet-ana-principal', lines: [{ slug: 'golden-beat-207', edition: '1/10', quantity: 1, price: '0.89' }] },
  { n: 9, status: 'confirmed', createdAt: '2026-09-14T11:21:00.000Z', walletId: 'wallet-ana-principal', lines: [{ slug: 'emerald-ape-042', edition: 'open', quantity: 1, price: '1.19' }] },
  { n: 10, status: 'rejected', createdAt: '2026-09-30T18:09:00.000Z', walletId: 'wallet-ana-principal', lines: [{ slug: 'sage-nomad-009', edition: '1/1', quantity: 1, price: '1.69' }] },
  { n: 11, status: 'confirmed', createdAt: '2026-10-12T09:33:00.000Z', walletId: 'wallet-ana-reserva', lines: [{ slug: 'neon-vessel-552', edition: 'open', quantity: 1, price: '1.99' }] },
  { n: 12, status: 'pending', createdAt: '2026-10-25T21:14:00.000Z', walletId: 'wallet-ana-principal', lines: [{ slug: 'violet-nomad-314', edition: '1/10', quantity: 1, price: '1.39' }] },
]

/** Tempo entre a criação e a conclusão do pagamento nas fixtures. */
const SETTLE_MS = 3_000

const hex = (seed: number, bytes: number) => {
  const random = createRandom(seed)
  return Array.from({ length: bytes }, () => random.int(0, 255).toString(16).padStart(2, '0')).join('')
}

function totalsOf(items: OrderItem[], network: Network, couponCode: string | undefined) {
  const subtotal = items.reduce((acc, i) => acc + BigInt(i.lineTotalWei), 0n)
  const coupon = couponCode ? COUPONS.find((c) => c.code === couponCode) : undefined
  let discount = 0n
  if (coupon) {
    discount = coupon.kind === 'percent' ? percentOfWei(subtotal, coupon.bps ?? 0) : BigInt(coupon.amountWei ?? '0')
    if (discount > subtotal) discount = subtotal
  }
  const fee = BigInt(NETWORK_FEES_WEI[network])
  return {
    coupon: coupon && discount > 0n ? { code: coupon.code, discountWei: discount.toString() } : null,
    totals: {
      subtotalWei: subtotal.toString(),
      discountWei: discount.toString(),
      networkFeeWei: fee.toString(),
      totalWei: (subtotal - discount + fee).toString(),
    },
  }
}

function buildRow(seed: Seed, userId: string, nfts: Map<string, Nft>): OrderRow {
  const user = USERS.find((u) => u.id === userId)
  const saved = WALLETS.find((w) => w.id === seed.walletId && w.userId === userId)
  if (!user || !saved) throw new Error(`Fixture de pedido inválida: ${seed.n}`)
  const id = `ord_fixture-${user.username}-${String(seed.n).padStart(4, '0')}`

  const items: OrderItem[] = seed.lines.map((line, index) => {
    const nft = nfts.get(line.slug)
    if (!nft) throw new Error(`NFT da fixture inexistente: ${line.slug}`)
    if (nft.network !== saved.network) throw new Error(`Rede do NFT difere da carteira: ${id}`)
    const unit = parseEth(line.price)
    return {
      id: `${id}-item-${index + 1}`,
      nftId: nft.id,
      edition: line.edition,
      quantity: line.quantity,
      unitPriceWei: unit.toString(),
      lineTotalWei: multiplyWei(unit, line.quantity).toString(),
      nft: {
        id: nft.id,
        slug: nft.slug,
        name: nft.name,
        tokenId: nft.tokenId,
        collection: nft.collection,
        network: nft.network,
        image: nft.image,
      },
    }
  })

  const wallet: WalletSnapshot = {
    walletId: saved.id,
    label: saved.label,
    provider: saved.provider,
    network: saved.network,
    address: saved.address,
    ensName: saved.ensName,
  }
  const collector: OrderCollector = {
    displayName: user.displayName,
    username: user.username,
    profileName: saved.nickname || user.displayName,
    email: saved.email ?? user.email,
    ensName: saved.ensName ?? user.ensName,
    secondaryWallet: null,
    referralCode: saved.referralCode,
    note: seed.note ?? null,
  }
  const settled = seed.status !== 'pending'
  const updatedAt = settled ? new Date(Date.parse(seed.createdAt) + SETTLE_MS).toISOString() : seed.createdAt

  return {
    id,
    idempotencyKey: `fixture-${user.username}-${String(seed.n).padStart(4, '0')}`,
    quoteId: `quote_fixture-${user.username}-${String(seed.n).padStart(4, '0')}`,
    status: seed.status,
    items,
    ...totalsOf(items, saved.network, seed.coupon),
    wallet,
    network: saved.network,
    collector,
    txHash: seed.status === 'confirmed' ? `0x${hex(7_000 + seed.n, 32)}` : null,
    rejectionCode: seed.status === 'rejected' ? 'payment_declined' : null,
    rejectionReason:
      seed.status === 'rejected' ? 'O pagamento foi recusado pela carteira. Seus itens continuam no carrinho.' : null,
    createdAt: seed.createdAt,
    updatedAt,
    version: settled ? 2 : 1,
    userId,
    requestHash: `fixture-${seed.n}`,
    settleAt: settled ? updatedAt : seed.createdAt,
    // `hold`: o pagamento simulado nunca conclui (o pedido fica `pending`).
    outcome: seed.status === 'pending' ? 'hold' : seed.status === 'rejected' ? 'reject' : 'confirm',
  }
}

/** Pedidos das fixtures (todas as contas). */
export function seedOrders(): OrderRow[] {
  const nfts = new Map(seedNfts().map((n) => [n.slug, n]))
  return ANA_SEEDS.map((seed) => buildRow(seed, 'user-ana', nfts))
}
