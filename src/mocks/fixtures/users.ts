import type { OAuthProvider, User } from '@/entities/session'

/**
 * Usuários do servidor simulado (data-model.md → Fixtures). A senha fica em texto puro só porque
 * isto é um mock no navegador: nenhum dado real passa por aqui.
 * - ana@kurio.dev / Senha@123: conta com histórico (carteiras e pedidos nas Fases 5–7); vinculada ao Google.
 * - bruno@kurio.dev / Senha@123: conta nova; vinculada ao Facebook.
 */
export type UserFixture = User & {
  password: string
  /** Provedores OAuth simulados vinculados à conta (D-05). */
  oauthProviders: OAuthProvider[]
}

export const FIXTURE_PASSWORD = 'Senha@123'

export const USERS: UserFixture[] = [
  {
    id: 'user-ana',
    username: 'ana',
    displayName: 'Ana Ribeiro',
    email: 'ana@kurio.dev',
    ensName: 'ana.eth',
    avatarUrl: null,
    createdAt: '2026-01-15T12:00:00.000Z',
    password: FIXTURE_PASSWORD,
    oauthProviders: ['google'],
  },
  {
    id: 'user-bruno',
    username: 'bruno',
    displayName: 'Bruno Lima',
    email: 'bruno@kurio.dev',
    ensName: null,
    avatarUrl: null,
    createdAt: '2026-09-01T12:00:00.000Z',
    password: FIXTURE_PASSWORD,
    oauthProviders: ['facebook'],
  },
]
