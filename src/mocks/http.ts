import { HttpResponse } from 'msw'

/**
 * Respostas HTTP comuns do servidor simulado. Módulo neutro (não importa `db/`, `handlers/` nem
 * `scenarios/`), para poder ser usado por todos eles sem dependência circular.
 */

/** Envelope de erro do contrato: `{ code, message, details? }`. */
export const apiError = (status: number, code: string, message: string, details?: Record<string, unknown>) =>
  HttpResponse.json({ code, message, ...(details ? { details } : {}) }, { status })

/** 404 `not_found` com a mensagem do recurso. */
export const notFound = (message: string) => apiError(404, 'not_found', message)

/** 400 para corpo que não é um objeto JSON (rotas que fazem PATCH parcial ou leem campos soltos). */
export const invalidBody = () => apiError(400, 'validation_error', 'Corpo da requisição inválido')

export const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Corpo JSON da requisição, ou `null` se vazio/inválido. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

type Issue = { path: readonly PropertyKey[]; message: string }

/**
 * 422 `validation_error` com `details` = `{ campo: mensagem }` (caminho com ponto: `collector.email`).
 * Com mais de uma mensagem para o mesmo campo vale a primeira (`keep: 'first'`, padrão: a ordem das
 * regras no schema define a prioridade) ou a última (`keep: 'last'`, contrato histórico do carrinho).
 */
export function validationError(issues: readonly Issue[], { keep = 'first' }: { keep?: 'first' | 'last' } = {}) {
  const fields: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || '_'
    if (keep === 'last') fields[key] = issue.message
    else fields[key] ??= issue.message
  }
  return apiError(422, 'validation_error', 'Dados inválidos', fields)
}
