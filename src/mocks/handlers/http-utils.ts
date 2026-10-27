import { HttpResponse } from 'msw'

/** Envelope de erro do contrato: `{ code, message, details? }`. */
export const apiError = (status: number, code: string, message: string, details?: Record<string, unknown>) =>
  HttpResponse.json({ code, message, ...(details ? { details } : {}) }, { status })

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

/** 422 `validation_error` com `details` = `{ campo: primeira mensagem }` (caminho com ponto: `collector.email`). */
export function validationError(issues: readonly { path: readonly PropertyKey[]; message: string }[]) {
  const fields: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || '_'
    fields[key] ??= issue.message
  }
  return apiError(422, 'validation_error', 'Dados inválidos', fields)
}

export { hashString, stableStringify } from '@/lib/hash'
