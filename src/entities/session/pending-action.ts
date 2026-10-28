import { z } from 'zod'

/**
 * Ação que o visitante tentou fazer sem sessão (ex.: favoritar). Fica no sessionStorage para que
 * o login (Fase 4) a conclua e devolva o usuário à rota de origem (`redirect`).
 * Acesso ao storage sempre em try/catch: modo privado ou storage bloqueado não podem quebrar a UI.
 */
const STORAGE_KEY = 'kurio:pending-action'
/** Depois disso a ação é velha demais para ser concluída sozinha (o usuário já seguiu adiante). */
const MAX_AGE_MS = 30 * 60_000

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

/** Ação pendente válida; vencida (mais de 30 min) ou corrompida é descartada. */
export function readPendingAction(): PendingAction | null {
  let action: PendingAction | null = null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = pendingActionSchema.safeParse(JSON.parse(raw))
    action = parsed.success ? parsed.data : null
  } catch {
    return null
  }
  if (!action || Date.now() - action.createdAt > MAX_AGE_MS) {
    clearPendingAction()
    return null
  }
  return action
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
 * depois do login). Ações vencidas já são descartadas por `readPendingAction`.
 */
export function takePendingAction<T extends PendingAction>(match: (action: PendingAction) => action is T): T | null {
  const action = readPendingAction()
  if (!action || !match(action)) return null
  clearPendingAction()
  return action
}
