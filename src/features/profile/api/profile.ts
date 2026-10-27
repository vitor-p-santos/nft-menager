import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { sessionStore, type AuthResponse } from '@/entities/session'
import { walletKeys } from '@/entities/wallet'
import { api, http } from '@/lib/api'
import {
  avatarUploadSchema,
  changePasswordRequestSchema,
  profileFormSchema,
  profileSchema,
  profileToUser,
  type ChangePasswordRequest,
  type Profile,
  type UpdateProfileRequest,
} from '../schemas'
import { AUTH_ME_KEY, profileKeys } from './keys'

export const profileQueries = {
  /** Perfil do usuário logado (`GET /me/profile`). Exige sessão (`enabled: isAuthenticated`). */
  detail: () =>
    queryOptions({
      queryKey: profileKeys.detail(),
      queryFn: ({ signal }) => api.get('/me/profile', profileSchema, { signal }),
    }),
}

/**
 * Propaga o perfil novo: cache do perfil, sessão local (header/menu via `useCurrentUser`) e o
 * `GET /auth/me` em cache. Usado por todas as mutations do perfil.
 */
export function applyProfile(queryClient: QueryClient, profile: Profile) {
  queryClient.setQueryData(profileKeys.detail(), profile)
  const user = profileToUser(profile)
  sessionStore.updateUser(user)
  queryClient.setQueryData<AuthResponse>(AUTH_ME_KEY, (previous) => (previous ? { ...previous, user } : previous))
}

/**
 * "Salvar" dos dados do perfil (`PATCH /me/profile`). Envie os valores do formulário (o schema
 * normaliza: ENS ganha ".eth", vazios viram `null`). Erros: 422 `validation_error` (por campo),
 * 409 `email_taken`/`username_taken` → `getProfileFormErrors`. Trocar `walletNickname` renomeia a
 * carteira principal, então as carteiras também são invalidadas.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: UpdateProfileRequest) =>
      api.patch('/me/profile', profileFormSchema.partial().parse(values), profileSchema),
    onSuccess: (profile, values) => {
      applyProfile(queryClient, profile)
      if (values.walletNickname !== undefined) void queryClient.invalidateQueries({ queryKey: walletKeys.all })
    },
  })
}

/** Envia o avatar já preparado (`prepareAvatar(file)` → data URL). Erro 422 em `dataUrl`. */
export function useUploadAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dataUrl: string) => api.put('/me/avatar', avatarUploadSchema.parse({ dataUrl }), profileSchema),
    onSuccess: (profile) => applyProfile(queryClient, profile),
  })
}

/** "Remover" o avatar (idempotente). */
export function useRemoveAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => profileSchema.parse((await http.delete<unknown>('/me/avatar')).data),
    onSuccess: (profile) => applyProfile(queryClient, profile),
  })
}

/**
 * Alterar senha (`POST /me/password` → 204). Recebe `toChangePasswordRequest(valoresDoForm)`.
 * Erros: 422 `wrong_password` (`currentPassword`) e `validation_error` (`newPassword`). A sessão
 * atual continua válida; as outras sessões do usuário são revogadas pelo servidor.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (request: ChangePasswordRequest) => {
      await http.post('/me/password', changePasswordRequestSchema.parse(request))
    },
  })
}
