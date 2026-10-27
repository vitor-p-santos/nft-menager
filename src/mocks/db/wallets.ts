import type { Network } from '@/entities/nft'
import { sameWalletAddress, type Wallet } from '@/entities/wallet'
import type { WalletInput } from '@/features/profile/schemas'
import { WALLETS, type WalletFixture } from '../fixtures/wallets'
import { loadTable, saveTable } from './storage'

type WalletRow = WalletFixture
type WalletsById = Record<string, WalletRow>
const TABLE = 'wallets'
const all = () => loadTable<WalletsById>(TABLE, () => Object.fromEntries(WALLETS.map((w) => [w.id, structuredClone(w)])))

const toPublic = ({ userId: _userId, createdAt: _createdAt, ...wallet }: WalletRow): Wallet => wallet

/** Principal primeiro; as demais da mais antiga para a mais nova. */
const byRoleThenAge = (a: WalletRow, b: WalletRow) =>
  a.role === b.role ? a.createdAt.localeCompare(b.createdAt) : a.role === 'primary' ? -1 : 1

const rowsOf = (wallets: WalletsById, userId: string) =>
  Object.values(wallets)
    .filter((w) => w.userId === userId)
    .sort(byRoleThenAge)

/** Campos editáveis vindos do schema → colunas da linha (`label` vazio usa o apelido). */
function fieldsFrom(input: WalletInput) {
  const { label, ...rest } = input
  return { ...rest, label: label ?? input.nickname }
}

/**
 * Carteiras por usuário. Sempre filtradas pelo dono vindo do token: a carteira de outro usuário é
 * tratada como inexistente. Invariante: quem tem carteiras tem exatamente uma `primary`.
 */
export const walletsTable = {
  listByUser(userId: string): Wallet[] {
    return rowsOf(all(), userId).map(toPublic)
  },
  countByUser: (userId: string) => rowsOf(all(), userId).length,
  findForUser(userId: string, id: string): Wallet | undefined {
    const row = all()[id]
    return row && row.userId === userId ? toPublic(row) : undefined
  },
  primaryForUser(userId: string): Wallet | undefined {
    const row = rowsOf(all(), userId).find((w) => w.role === 'primary')
    return row && toPublic(row)
  },
  /** Outra carteira do usuário com o mesmo endereço na mesma rede. */
  findDuplicate(userId: string, network: Network, address: string, exceptId?: string): Wallet | undefined {
    const row = rowsOf(all(), userId).find(
      (w) => w.id !== exceptId && w.network === network && sameWalletAddress(w.address, address, network),
    )
    return row && toPublic(row)
  },
  /** A 1ª carteira do usuário é sempre a principal; `makePrimary` rebaixa a atual. */
  create(userId: string, input: WalletInput, makePrimary: boolean): Wallet {
    const wallets = all()
    const own = rowsOf(wallets, userId)
    const primary = makePrimary || own.length === 0
    if (primary) for (const row of own) row.role = 'secondary'
    const row: WalletRow = {
      id: `wallet-${crypto.randomUUID()}`,
      userId,
      role: primary ? 'primary' : 'secondary',
      createdAt: new Date().toISOString(),
      ...fieldsFrom(input),
    }
    wallets[row.id] = row
    saveTable(TABLE, wallets)
    return toPublic(row)
  },
  update(userId: string, id: string, input: WalletInput): Wallet | undefined {
    const wallets = all()
    const row = wallets[id]
    if (!row || row.userId !== userId) return undefined
    wallets[id] = { ...row, ...fieldsFrom(input) }
    saveTable(TABLE, wallets)
    return toPublic(wallets[id])
  },
  /** Só o apelido (usado pelo `PATCH /me/profile` para a carteira principal). */
  rename(userId: string, id: string, nickname: string): Wallet | undefined {
    const wallets = all()
    const row = wallets[id]
    if (!row || row.userId !== userId) return undefined
    row.nickname = nickname
    saveTable(TABLE, wallets)
    return toPublic(row)
  },
  /**
   * Remove a carteira. Se era a principal, a secundária mais antiga é promovida (`promoted`).
   * Remover a única carteira é permitido: o usuário fica sem carteira salva (o checkout aceita a
   * carteira digitada). Pedidos guardam um snapshot da carteira, então não são afetados.
   */
  remove(userId: string, id: string): { promoted: Wallet | null } | undefined {
    const wallets = all()
    const row = wallets[id]
    if (!row || row.userId !== userId) return undefined
    delete wallets[id]
    let promoted: Wallet | null = null
    if (row.role === 'primary') {
      const next = rowsOf(wallets, userId)[0]
      if (next) {
        next.role = 'primary'
        promoted = toPublic(next)
      }
    }
    saveTable(TABLE, wallets)
    return { promoted }
  },
  /** Define a principal (idempotente) e devolve a lista atualizada. */
  setPrimary(userId: string, id: string): Wallet[] | undefined {
    const wallets = all()
    const row = wallets[id]
    if (!row || row.userId !== userId) return undefined
    for (const own of rowsOf(wallets, userId)) own.role = own.id === id ? 'primary' : 'secondary'
    saveTable(TABLE, wallets)
    return rowsOf(wallets, userId).map(toPublic)
  },
}
