import { useRouter } from '@tanstack/react-router'
import { readPendingAction, sanitizeRedirect } from '@/entities/session'

/**
 * Depois de entrar (login, cadastro ou OAuth), volta ao fluxo anterior:
 * 1. a rota da ação pendente (ex.: favoritar sem sessão), que a própria tela conclui ao montar;
 * 2. senão, o `redirect` do search param (expiração de sessão, rota privada);
 * 3. senão, `fallback` (páginas mobile → Início; modal → fica onde está).
 * Navega com `replace` para que "voltar" não reabra a tela de login.
 */
export function useAuthSuccess() {
  const router = useRouter()

  return (redirect: string | undefined, fallback: string | null) => {
    const pending = readPendingAction()
    const target = pending ? sanitizeRedirect(pending.redirect) : redirect ? sanitizeRedirect(redirect) : fallback
    if (!target || target === router.state.location.href) return
    void router.navigate({ href: target, replace: true })
  }
}
