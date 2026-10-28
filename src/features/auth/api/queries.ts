import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { onSessionExpired, type OAuthProvider, type SessionExpiredEvent } from '@/entities/session'
import { api, http } from '@/lib/api'
import {
  authResponseSchema,
  loginSchema,
  passwordResetSchema,
  registerRequestSchema,
  type LoginFormValues,
  type PasswordResetFormValues,
  type RegisterRequest,
} from '../schemas/auth'
import { completeSignIn, signOut } from './session'

export { authKeys } from './keys'

/**
 * Login por e-mail/senha. A mutation só resolve depois do merge do carrinho e da troca do cache:
 * no `onSuccess` a UI já pode navegar para o `redirect` e concluir a ação pendente.
 */
export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const auth = await api.post('/auth/login', loginSchema.parse(values), authResponseSchema)
      await completeSignIn(queryClient, auth)
      return auth
    },
  })
}

/**
 * Cadastro (201 já autenticado). Recebe o corpo da API: `toRegisterRequest(valoresDoForm)` (sem a
 * confirmação). Erros 409 `email_taken`/`username_taken` → `getAuthFormError`.
 */
export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: RegisterRequest) => {
      const body = registerRequestSchema.parse(request)
      const auth = await api.post('/auth/register', body, authResponseSchema)
      await completeSignIn(queryClient, auth)
      return auth
    },
  })
}

/** Login social simulado (D-05): Google → conta da Ana, Facebook → conta do Bruno. */
export function useOAuthLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (provider: OAuthProvider) => {
      const auth = await api.post(`/auth/oauth/${encodeURIComponent(provider)}`, null, authResponseSchema)
      await completeSignIn(queryClient, auth)
      return auth
    },
  })
}

/** Logout: conclui localmente mesmo se a API falhar. */
export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: () => signOut(queryClient) })
}

/** "Esqueceu a senha?" (D-07): 202 sem corpo; a UI mostra `PASSWORD_RESET_NEUTRAL_MESSAGE`. */
export function usePasswordReset() {
  return useMutation({
    mutationFn: async (values: PasswordResetFormValues) => {
      await http.post('/auth/password-reset', passwordResetSchema.parse(values))
    },
  })
}

/**
 * Chama `listener` quando a API responde 401 `session_expired` (a sessão já foi limpa).
 * Uso típico no layout raiz: abrir o login com `redirect` = `location.href` atual.
 */
export function useSessionExpiredListener(listener: (event: SessionExpiredEvent) => void) {
  const ref = useRef(listener)
  useEffect(() => {
    ref.current = listener
  })
  useEffect(() => onSessionExpired((event) => ref.current(event)), [])
}
