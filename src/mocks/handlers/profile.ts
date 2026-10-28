import { http, HttpResponse } from 'msw'
import {
  avatarUploadSchema,
  changePasswordRequestSchema,
  profileFormSchema,
  WALLET_NICKNAME_REQUIRED,
  WALLET_NICKNAME_WITHOUT_WALLET,
  type Profile,
} from '@/features/profile/schemas'
import { API_BASE_URL } from '@/lib/api'
import { sessionsTable } from '../db/session'
import { toPublicUser, usersTable, type UserRow } from '../db/users'
import { walletsTable } from '../db/wallets'
import { apiError, invalidBody, isJsonObject, notFound, readJson, validationError } from '../http'
import { withScenario } from '../scenarios'
import { withAuth } from '../with-auth'

const userNotFound = () => notFound('Usuário não encontrado')

function toProfile(user: UserRow): Profile {
  return { ...toPublicUser(user), walletNickname: walletsTable.primaryForUser(user.id)?.nickname ?? null }
}

/** `localStorage` cheio (data URL grande demais para o banco simulado). */
const isQuotaError = (error: unknown) => error instanceof DOMException && error.name === 'QuotaExceededError'

/** Perfil do usuário logado (US-08). O usuário vem sempre do token; nunca do corpo. */
export const profileHandlers = [
  http.get(
    `${API_BASE_URL}/me/profile`,
    withScenario(
      'profile.get',
      withAuth((_info, { user }) => HttpResponse.json(toProfile(user))),
    ),
  ),

  /**
   * PATCH parcial: o corpo é juntado aos dados atuais e o resultado é validado inteiro (422 com
   * erros por campo). E-mail e usuário únicos (409 `email_taken`/`username_taken`, `details.field`).
   * `walletNickname` renomeia a carteira principal.
   */
  http.patch(
    `${API_BASE_URL}/me/profile`,
    withScenario(
      'profile.update',
      withAuth(async ({ request }, auth) => {
        const body = await readJson(request)
        if (!isJsonObject(body)) return invalidBody()

        const user = auth.user
        const primary = walletsTable.primaryForUser(user.id)
        const current = {
          displayName: user.displayName,
          username: user.username,
          email: user.email,
          ensName: user.ensName,
          walletNickname: primary?.nickname ?? null,
        }
        const parsed = profileFormSchema.safeParse({ ...current, ...body })
        if (!parsed.success) return validationError(parsed.error.issues)
        const input = parsed.data

        if (primary && !input.walletNickname) {
          return validationError([{ path: ['walletNickname'], message: WALLET_NICKNAME_REQUIRED }])
        }
        if (!primary && input.walletNickname) {
          return validationError([{ path: ['walletNickname'], message: WALLET_NICKNAME_WITHOUT_WALLET }])
        }
        const emailOwner = usersTable.findByEmail(input.email)
        if (emailOwner && emailOwner.id !== user.id) {
          return apiError(409, 'email_taken', 'Este e-mail já está cadastrado', { field: 'email' })
        }
        const usernameOwner = usersTable.findByUsername(input.username)
        if (usernameOwner && usernameOwner.id !== user.id) {
          return apiError(409, 'username_taken', 'Este nome de usuário já está em uso', { field: 'username' })
        }

        const updated = usersTable.update(user.id, {
          displayName: input.displayName,
          username: input.username,
          email: input.email,
          ensName: input.ensName,
        })
        if (!updated) return userNotFound()
        if (primary && input.walletNickname && input.walletNickname !== primary.nickname) {
          walletsTable.rename(user.id, primary.id, input.walletNickname)
        }
        return HttpResponse.json(toProfile(updated))
      }),
    ),
  ),

  /** Avatar como data URL (PNG/JPEG/WebP, até 2 MB, assinatura conferida). Substitui o anterior. */
  http.put(
    `${API_BASE_URL}/me/avatar`,
    withScenario(
      'profile.avatar',
      withAuth(async ({ request }, auth) => {
        const body = await readJson(request)
        if (!isJsonObject(body)) return invalidBody()
        const parsed = avatarUploadSchema.safeParse(body)
        if (!parsed.success) return validationError(parsed.error.issues)
        try {
          const updated = usersTable.update(auth.user.id, { avatarUrl: parsed.data.dataUrl })
          if (!updated) return userNotFound()
          return HttpResponse.json(toProfile(updated))
        } catch (error) {
          if (!isQuotaError(error)) throw error
          return apiError(413, 'payload_too_large', 'Imagem grande demais para o armazenamento local', {
            dataUrl: 'Imagem grande demais para o armazenamento local',
          })
        }
      }),
    ),
  ),

  /** Remove o avatar (idempotente). */
  http.delete(
    `${API_BASE_URL}/me/avatar`,
    withScenario(
      'profile.avatar',
      withAuth((_info, auth) => {
        const updated = usersTable.update(auth.user.id, { avatarUrl: null })
        if (!updated) return userNotFound()
        return HttpResponse.json(toProfile(updated))
      }),
    ),
  ),

  /**
   * Troca de senha: 422 `validation_error` (regras da senha nova, igual à atual) ou 422
   * `wrong_password` (`details.currentPassword`). Sucesso → 204 e as outras sessões são revogadas.
   */
  http.post(
    `${API_BASE_URL}/me/password`,
    withScenario(
      'profile.password',
      withAuth(async ({ request }, auth) => {
        const body = await readJson(request)
        if (!isJsonObject(body)) return invalidBody()
        const parsed = changePasswordRequestSchema.safeParse(body)
        if (!parsed.success) return validationError(parsed.error.issues)
        if (parsed.data.currentPassword !== auth.user.password) {
          return apiError(422, 'wrong_password', 'Senha atual incorreta', { currentPassword: 'Senha atual incorreta' })
        }
        usersTable.update(auth.user.id, { password: parsed.data.newPassword })
        sessionsTable.revokeOthers(auth.user.id, auth.token)
        return new HttpResponse(null, { status: 204 })
      }),
    ),
  ),
]
