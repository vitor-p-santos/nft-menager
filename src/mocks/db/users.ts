import type { OAuthProvider, User } from '@/entities/session'
import { USERS, type UserFixture } from '../fixtures/users'
import { loadTable, saveTable } from './storage'

export type UserRow = UserFixture
type UsersById = Record<string, UserRow>

const TABLE = 'users'
const seed = (): UsersById => Object.fromEntries(USERS.map((u) => [u.id, structuredClone(u)]))
const all = () => loadTable<UsersById>(TABLE, seed)
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** Converte a linha do banco no `User` público (nunca expõe senha nem vínculos OAuth). */
export function toPublicUser(row: UserRow): User {
  const { id, username, displayName, email, ensName, avatarUrl, createdAt } = row
  return { id, username, displayName, email, ensName, avatarUrl, createdAt }
}

export const usersTable = {
  find: (id: string): UserRow | undefined => all()[id],
  findByEmail: (email: string) => Object.values(all()).find((u) => same(u.email, email)),
  findByUsername: (username: string) => Object.values(all()).find((u) => same(u.username, username)),
  /** Primeira conta vinculada ao provedor (D-05). */
  findByProvider: (provider: OAuthProvider) => Object.values(all()).find((u) => u.oauthProviders.includes(provider)),
  create(input: { username: string; email: string; password: string }): UserRow {
    const users = all()
    const row: UserRow = {
      id: `user-${crypto.randomUUID()}`,
      username: input.username,
      displayName: input.username,
      email: input.email,
      ensName: null,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      password: input.password,
      oauthProviders: [],
    }
    users[row.id] = row
    saveTable(TABLE, users)
    return row
  },
  update(id: string, patch: Partial<Omit<UserRow, 'id'>>): UserRow | undefined {
    const users = all()
    const row = users[id]
    if (!row) return undefined
    users[id] = { ...row, ...patch }
    saveTable(TABLE, users)
    return users[id]
  },
}
