import { z } from 'zod'
import { emailSchema, newPasswordSchema, safeRedirectSchema, usernameSchema } from '@/entities/session'

/** Campos de conta: definidos em `entities/session/fields.ts` (o perfil também usa). */
export { emailSchema, newPasswordSchema, PASSWORD_MIN, usernameSchema } from '@/entities/session'

export {
  authResponseSchema,
  oauthProviderSchema,
  OAUTH_PROVIDERS,
  sessionSchema,
  userSchema,
  type AuthResponse,
  type OAuthProvider,
  type Session,
  type User,
} from '@/entities/session'

/**
 * Schemas dos formulários de auth (RHF + zodResolver) e dos corpos validados pelos handlers MSW.
 * Mensagens em português. Tipos do form: `z.input` (valor dos campos) / `z.infer` (após o parse).
 */

// --- Login -----------------------------------------------------------------------------------
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe a senha'),
})
export type LoginFormValues = z.input<typeof loginSchema>
export type LoginInput = z.infer<typeof loginSchema>

// --- Cadastro --------------------------------------------------------------------------------
/** Corpo de `POST /auth/register` (o que o servidor valida). */
export const registerRequestSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: newPasswordSchema,
})
export type RegisterRequest = z.infer<typeof registerRequestSchema>

/** Formulário de cadastro: o corpo da API + confirmação de senha (só no client). */
export const registerSchema = registerRequestSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme a senha') })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem',
  })
export type RegisterFormValues = z.input<typeof registerSchema>
export type RegisterInput = z.infer<typeof registerSchema>

export function toRegisterRequest({ username, email, password }: RegisterInput): RegisterRequest {
  return { username, email, password }
}

// --- Esqueceu a senha (D-07) -----------------------------------------------------------------
export const passwordResetSchema = z.object({ email: emailSchema })
export type PasswordResetFormValues = z.input<typeof passwordResetSchema>
export type PasswordResetInput = z.infer<typeof passwordResetSchema>

/** Mensagem neutra: não revela se o e-mail existe. */
export const PASSWORD_RESET_NEUTRAL_MESSAGE =
  'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.'

// --- Search param das telas de login (mobile) e do modal (desktop) ----------------------------
/** `?redirect=/caminho?com=search` — inválido vira `undefined` em vez de quebrar a rota. */
export const authSearchSchema = z.object({
  redirect: safeRedirectSchema.optional().catch(undefined),
})
