import type { Edition } from '@/entities/nft'
import { loadTable, saveTable } from './storage'

export type CartRow = {
  id: string
  nftId: string
  edition: Edition
  quantity: number
  unitPriceWei: string
  addedAt: string
}

export type StoredCart = {
  id: string
  ownerId: string | null
  anonymousId: string | null
  items: CartRow[]
  couponCode: string | null
  version: number
}

type CartsByKey = Record<string, StoredCart>
const TABLE = 'carts'

/** Chave do carrinho: `user:<id>` (com sessão) ou `anon:<X-Cart-Id>`. */
export type CartOwner = { userId: string } | { anonymousId: string }
const keyOf = (owner: CartOwner) => ('userId' in owner ? `user:${owner.userId}` : `anon:${owner.anonymousId}`)

export const cartsTable = {
  /** Carrinho do dono; vazio (versão 0, não persistido) se ainda não existe. */
  get(owner: CartOwner): StoredCart {
    const found = loadTable<CartsByKey>(TABLE, () => ({}))[keyOf(owner)]
    if (found) return found
    return {
      id: crypto.randomUUID(),
      ownerId: 'userId' in owner ? owner.userId : null,
      anonymousId: 'anonymousId' in owner ? owner.anonymousId : null,
      items: [],
      couponCode: null,
      version: 0,
    }
  },
  /** Persiste incrementando `version`. */
  save(owner: CartOwner, cart: StoredCart): StoredCart {
    const all = loadTable<CartsByKey>(TABLE, () => ({}))
    const next = { ...cart, version: cart.version + 1 }
    all[keyOf(owner)] = next
    saveTable(TABLE, all)
    return next
  },
  remove(owner: CartOwner) {
    const all = loadTable<CartsByKey>(TABLE, () => ({}))
    delete all[keyOf(owner)]
    saveTable(TABLE, all)
  },
}
