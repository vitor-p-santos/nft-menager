import { z } from 'zod'

/**
 * Ação que o visitante tentou fazer sem sessão (ex.: favoritar). Fica no sessionStorage para que
 * o login (Fase 4) a conclua e devolva o usuário à rota de origem (`redirect`).
 * Acesso ao storage sempre em try/catch: modo privado ou storage bloqueado não podem quebrar a UI.
 */
const STORAGE_KEY = 'kurio:pending-action'

export const pendingActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('favorite'),
    nftId: z.string().min(1),
    /** Caminho interno (pathname + search + hash) para voltar depois do login. */
    redirect: z.string().startsWith('/'),
    createdAt: z.number().int().nonnegative(),
  }),
])
export type PendingAction = z.infer<typeof pendingActionSchema>

export function savePendingAction(action: PendingAction): boolean {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(action))
    return true
  } catch {
    return false
  }
}

export function readPendingAction(): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = pendingActionSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function clearPendingAction() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage indisponível: nada a limpar
  }
}

/**
 * Lê e remove a ação pendente se ela satisfizer `match` (ex.: o FavoriteButton do mesmo NFT,
 * depois do login). Ações com mais de `maxAgeMs` são descartadas.
 */
export function takePendingAction<T extends PendingAction>(
  match: (action: PendingAction) => action is T,
  maxAgeMs = 30 * 60_000,
): T | null {
  const action = readPendingAction()
  if (!action) return null
  if (Date.now() - action.createdAt > maxAgeMs) {
    clearPendingAction()
    return null
  }
  if (!match(action)) return null
  clearPendingAction()
  return action
}
