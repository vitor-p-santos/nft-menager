import { useRouter } from '@tanstack/react-router'
import { clearPendingAction, readPendingAction, sanitizeRedirect } from '@/entities/session'

/**
 * Depois de entrar (login, cadastro ou OAuth), volta ao fluxo anterior: o `redirect` do search param
 * (expiração de sessão, rota privada, "Entre para favoritar"); sem ele, `fallback` (páginas mobile →
 * Início; modal → fica onde está). Navega com `replace` para que "voltar" não reabra o login.
 *
 * A ação pendente (ex.: favoritar sem sessão) só vale para o fluxo que levou a este login: o destino
 * é a rota dela (mesmo `redirect` ou, sem `redirect`, a tela atual), e a própria tela a conclui ao
 * montar. Uma ação de outro fluxo (o usuário desistiu e foi comprar) é descartada: antes ela
 * sequestrava o redirect e favoritava sem o usuário pedir.
 */
export function useAuthSuccess() {
  const router = useRouter()

  return (redirect: string | undefined, fallback: string | null) => {
    const here = router.state.location.href
    const target = redirect ? sanitizeRedirect(redirect) : fallback
    const pending = readPendingAction()
    if (pending && sanitizeRedirect(pending.redirect) !== (redirect ? target : here)) clearPendingAction()
    if (!target || target === here) return
    void router.navigate({ href: target, replace: true })
  }
}
