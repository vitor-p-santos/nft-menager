import { ApiError } from '@/lib/api'

/**
 * Erros prontos para os formulários de perfil, senha, avatar e carteiras:
 * `fields` → `setError(campo, { message })`; `form` → erro geral (`root`), anunciado com `role="alert"`.
 */
export type FormErrors<F extends string> = { fields: Partial<Record<F, string>>; form: string | null }

/** Códigos de negócio que apontam para um campo. */
const CODE_FIELD: Record<string, string> = {
  email_taken: 'email',
  username_taken: 'username',
  wrong_password: 'currentPassword',
  wallet_exists: 'address',
}

const MESSAGES: Record<string, string> = {
  email_taken: 'Este e-mail já está cadastrado.',
  username_taken: 'Este nome de usuário já está em uso.',
  wrong_password: 'Senha atual incorreta.',
  wallet_exists: 'Esta carteira já está salva nesta rede.',
}

function generalMessage(error: ApiError): string {
  switch (error.code) {
    case 'wallet_limit_reached':
    case 'payload_too_large':
      return error.message
  }
  switch (error.kind) {
    case 'timeout':
      return 'O servidor demorou para responder. Tente novamente.'
    case 'network':
      return 'Sem conexão. Verifique sua internet e tente novamente.'
    case 'unavailable':
      return 'Serviço indisponível no momento. Tente novamente em instantes.'
    case 'not_found':
      return 'Não encontramos este item. Atualize a página.'
    case 'validation':
      return 'Confira os dados informados.'
    default:
      return 'Não foi possível salvar. Tente novamente.'
  }
}

/**
 * Traduz o `ApiError` em erros por campo (só os campos do formulário, `fields`) e geral.
 * `validation_error`: cada chave de `details` que for campo do formulário; `email_taken`,
 * `username_taken`, `wrong_password`, `wallet_exists`: o campo correspondente. O avatar usa o campo
 * `dataUrl`. Sem campo reconhecido, a mensagem vira erro geral.
 */
export function getProfileFormErrors<F extends string>(error: unknown, fields: readonly F[]): FormErrors<F> {
  if (!(error instanceof ApiError)) return { fields: {}, form: 'Algo deu errado. Tente novamente.' }
  const isField = (key: string): key is F => (fields as readonly string[]).includes(key)
  const result: FormErrors<F> = { fields: {}, form: null }

  const codeField = CODE_FIELD[error.code]
  if (codeField !== undefined && isField(codeField)) {
    result.fields[codeField] = MESSAGES[error.code] ?? error.message
    return result
  }
  if (error.code === 'validation_error' || error.code === 'payload_too_large') {
    for (const [key, value] of Object.entries(error.details ?? {})) {
      if (isField(key) && typeof value === 'string') result.fields[key] = value
    }
    if (Object.keys(result.fields).length > 0) return result
  }
  result.form = generalMessage(error)
  return result
}
