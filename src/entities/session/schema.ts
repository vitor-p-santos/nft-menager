import { z } from 'zod'

/**
 * Usuário e sessão do contrato (`contracts/rest-api.md` → Auth). Compartilhados porque header,
 * perfil, checkout e favoritos precisam do usuário logado; os formulários ficam em `features/auth`.
 * Campos opcionais do modelo chegam como `null` (nunca omitidos), como no carrinho.
 */
export const userSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string(),
  email: z.string(),
  ensName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  createdAt: z.iso.datetime(),
})
export type User = z.infer<typeof userSchema>

/** Token opaco com validade curta (padrão 15 min no mock). */
export const sessionSchema = z.object({
  token: z.string().min(1),
  userId: z.string().min(1),
  expiresAt: z.iso.datetime(),
})
export type Session = z.infer<typeof sessionSchema>

/** Resposta de cadastro, login, OAuth e `GET /auth/me`. */
export const authResponseSchema = z.object({
  user: userSchema,
  session: sessionSchema,
})
export type AuthResponse = z.infer<typeof authResponseSchema>

export const OAUTH_PROVIDERS = ['google', 'facebook'] as const
export const oauthProviderSchema = z.enum(OAUTH_PROVIDERS)
export type OAuthProvider = z.infer<typeof oauthProviderSchema>

/**
 * Destino interno para depois do login (`?redirect=`). Só caminhos da própria origem:
 * começa com `/`, mas não com `//` nem `/\` (evita open redirect para outro host).
 */
export const safeRedirectSchema = z
  .string()
  .max(2_000)
  .refine((value) => value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\'), {
    message: 'Destino inválido',
  })

/** Devolve o caminho se for seguro, senão `fallback`. */
export function sanitizeRedirect(value: unknown, fallback = '/'): string {
  const parsed = safeRedirectSchema.safeParse(value)
  return parsed.success ? parsed.data : fallback
}
