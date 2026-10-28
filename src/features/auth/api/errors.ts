import { ApiError } from '@/lib/api'

export type AuthFormField = 'username' | 'email' | 'password' | 'confirmPassword'

/** Erro pronto para o formulário: `field` → `setError(field)`; sem `field` → erro geral (`root`). */
export type AuthFormError = { field: AuthFormField | null; message: string }

const FIELDS: readonly AuthFormField[] = ['username', 'email', 'password', 'confirmPassword']
const isField = (value: unknown): value is AuthFormField => FIELDS.includes(value as AuthFormField)

/**
 * Traduz o `ApiError` das rotas de auth em feedback de formulário, em português:
 * `email_taken`/`username_taken` vão para o campo; `invalid_credentials` é geral (não diz qual
 * campo errou); `validation_error` usa o primeiro campo de `details`; falhas de rede/serviço são gerais.
 */
export function getAuthFormError(error: unknown): AuthFormError {
  if (!(error instanceof ApiError)) return { field: null, message: 'Algo deu errado. Tente novamente.' }
  switch (error.code) {
    case 'invalid_credentials':
      return { field: null, message: 'E-mail ou senha incorretos.' }
    case 'email_taken':
      return { field: 'email', message: 'Este e-mail já está cadastrado.' }
    case 'username_taken':
      return { field: 'username', message: 'Este nome de usuário já está em uso.' }
    case 'validation_error': {
      const entry = Object.entries(error.details ?? {}).find(([key, value]) => isField(key) && typeof value === 'string')
      if (entry) return { field: entry[0] as AuthFormField, message: String(entry[1]) }
      return { field: null, message: 'Confira os dados informados.' }
    }
  }
  switch (error.kind) {
    case 'timeout':
      return { field: null, message: 'O servidor demorou para responder. Tente novamente.' }
    case 'network':
      return { field: null, message: 'Sem conexão. Verifique sua internet e tente novamente.' }
    case 'unavailable':
      return { field: null, message: 'Serviço indisponível no momento. Tente novamente em instantes.' }
    case 'not_found':
      return { field: null, message: error.message }
    default:
      return { field: null, message: 'Não foi possível concluir. Tente novamente.' }
  }
}
