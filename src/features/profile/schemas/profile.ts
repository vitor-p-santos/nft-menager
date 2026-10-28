import { z } from 'zod'
import { displayNameSchema, emailSchema, newPasswordSchema, userSchema, usernameSchema, type User } from '@/entities/session'
import { stripEthSuffix } from '@/entities/wallet'
import { optionalEnsNameSchema, optionalText } from './text'

/**
 * Perfil do colecionador (contracts/rest-api.md → Perfil e carteiras). Os mesmos schemas validam o
 * formulário (RHF + zodResolver), o corpo no handler MSW e a resposta no client.
 */

/**
 * `GET/PATCH /me/profile`, `PUT/DELETE /me/avatar`: o `User` público + `walletNickname`, que é o
 * apelido da carteira **principal** ("Apelido da carteira" do Figma `d-08`). `null` sem carteiras.
 */
export const profileSchema = userSchema.extend({
  walletNickname: z.string().nullable(),
})
export type Profile = z.infer<typeof profileSchema>

/** Separa o `User` (sessão/header) do perfil. */
export function profileToUser(profile: Profile): User {
  const { id, username, displayName, email, ensName, avatarUrl, createdAt } = profile
  return { id, username, displayName, email, ensName, avatarUrl, createdAt }
}

/**
 * "Dados do perfil" (`PATCH /me/profile`). O PATCH é parcial: o servidor junta o corpo com os dados
 * atuais e valida o resultado com este schema. `walletNickname` é obrigatório se o usuário tem
 * carteira e deve ficar vazio se não tem (422 no campo; `hasWallet` em `profileFormSchemaFor`).
 */
export const profileFormSchema = z.object({
  displayName: displayNameSchema,
  username: usernameSchema,
  email: emailSchema,
  ensName: optionalEnsNameSchema,
  walletNickname: optionalText(40),
})
export type ProfileFormValues = z.input<typeof profileFormSchema>
export type ProfileInput = z.output<typeof profileFormSchema>
export type UpdateProfileRequest = Partial<ProfileFormValues>

export const WALLET_NICKNAME_REQUIRED = 'Informe o apelido da carteira'
export const WALLET_NICKNAME_WITHOUT_WALLET = 'Adicione uma carteira para definir o apelido'

/** Schema do formulário com a regra do apelido conforme o usuário tenha ou não carteira principal. */
export function profileFormSchemaFor(hasWallet: boolean) {
  return profileFormSchema.superRefine((value, ctx) => {
    if (hasWallet && !value.walletNickname) {
      ctx.addIssue({ code: 'custom', path: ['walletNickname'], message: WALLET_NICKNAME_REQUIRED })
    }
    if (!hasWallet && value.walletNickname) {
      ctx.addIssue({ code: 'custom', path: ['walletNickname'], message: WALLET_NICKNAME_WITHOUT_WALLET })
    }
  })
}

/** Valores iniciais do formulário a partir do perfil (opcionais `null` viram ''; o ENS sem o ".eth" fixo do campo). */
export function profileFormDefaults(profile: Profile): ProfileFormValues {
  return {
    displayName: profile.displayName,
    username: profile.username,
    email: profile.email,
    ensName: stripEthSuffix(profile.ensName),
    walletNickname: profile.walletNickname ?? '',
  }
}

// --- Alterar senha (`POST /me/password`) -------------------------------------------------------

/** Corpo validado pelo handler: senha atual obrigatória e nova senha com as regras do cadastro. */
export const changePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: newPasswordSchema,
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha precisa ser diferente da atual',
  })
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>

/** Formulário "Alterar senha" do Figma: senha atual, nova e confirmação (a confirmação fica no client). */
export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha precisa ser diferente da atual',
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem',
  })
export type ChangePasswordFormValues = z.input<typeof changePasswordFormSchema>
export type ChangePasswordInput = z.output<typeof changePasswordFormSchema>

export const changePasswordFormDefaults: ChangePasswordFormValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export function toChangePasswordRequest({ currentPassword, newPassword }: ChangePasswordInput): ChangePasswordRequest {
  return { currentPassword, newPassword }
}
