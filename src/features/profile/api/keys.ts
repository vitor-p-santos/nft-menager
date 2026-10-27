/** Query keys do perfil (privadas: saem do cache na troca de conta via `resetUserData`). */
export const profileKeys = {
  all: ['profile'] as const,
  detail: () => [...profileKeys.all, 'detail'] as const,
}

/**
 * `authKeys.me()` da feature auth (`['auth', 'me']`). Repetido aqui porque uma feature não importa
 * outra: o perfil editado precisa refletir no `GET /auth/me` em cache (header, menu da conta).
 */
export const AUTH_ME_KEY = ['auth', 'me'] as const
