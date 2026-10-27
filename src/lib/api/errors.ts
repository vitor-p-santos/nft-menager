import { AxiosError, isAxiosError } from 'axios'

/** Envelope de erro devolvido pela API (ver docs/contracts/rest-api.md). */
export type ApiErrorBody = {
  code: string
  message: string
  details?: Record<string, unknown>
}

export type ApiErrorKind =
  | 'validation' // 400 / 422
  | 'unauthorized' // 401 — sessão ausente ou expirada
  | 'forbidden' // 403
  | 'not_found' // 404
  | 'conflict' // 409 — preço/estoque mudou, chave de idempotência reutilizada
  | 'unavailable' // 503
  | 'timeout' // timeout do cliente
  | 'network' // sem resposta
  | 'unknown'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly code: string
  readonly details?: Record<string, unknown>

  constructor(params: {
    kind: ApiErrorKind
    status: number | null
    code: string
    message: string
    details?: Record<string, unknown>
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.kind = params.kind
    this.status = params.status
    this.code = params.code
    this.details = params.details
  }
}

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return 'validation'
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  if (status === 503) return 'unavailable'
  return 'unknown'
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiErrorBody).code === 'string' &&
    typeof (value as ApiErrorBody).message === 'string'
  )
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (!isAxiosError(error)) {
    return new ApiError({
      kind: 'unknown',
      status: null,
      code: 'unknown',
      message: error instanceof Error ? error.message : 'Erro inesperado',
    })
  }
  if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
    return new ApiError({ kind: 'timeout', status: null, code: 'timeout', message: 'A requisição expirou' })
  }
  if (!error.response) {
    return new ApiError({ kind: 'network', status: null, code: 'network', message: 'Falha de conexão' })
  }
  const { status, data } = error.response
  const body = isApiErrorBody(data) ? data : null
  return new ApiError({
    kind: kindFromStatus(status),
    status,
    code: body?.code ?? `http_${status}`,
    message: body?.message ?? error.message,
    details: body?.details,
  })
}
