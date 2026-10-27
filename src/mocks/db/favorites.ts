import { loadTable, saveTable } from './storage'

type FavoriteRow = { nftId: string; createdAt: string }
type FavoritesByUser = Record<string, FavoriteRow[]>

const TABLE = 'favorites'

/** Favoritos persistidos e isolados por usuário (chave = userId). */
export const favoritesTable = {
  list(userId: string): FavoriteRow[] {
    return loadTable<FavoritesByUser>(TABLE, () => ({}))[userId] ?? []
  },
  add(userId: string, nftId: string) {
    const all = loadTable<FavoritesByUser>(TABLE, () => ({}))
    const rows = all[userId] ?? []
    if (rows.some((r) => r.nftId === nftId)) return
    all[userId] = [{ nftId, createdAt: new Date().toISOString() }, ...rows]
    saveTable(TABLE, all)
  },
  remove(userId: string, nftId: string) {
    const all = loadTable<FavoritesByUser>(TABLE, () => ({}))
    all[userId] = (all[userId] ?? []).filter((r) => r.nftId !== nftId)
    saveTable(TABLE, all)
  },
}
