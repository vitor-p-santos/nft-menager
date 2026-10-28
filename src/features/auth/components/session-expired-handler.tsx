import { useRouter } from '@tanstack/react-router'
import { useSessionExpiredListener } from '../api'
import { SESSION_EXPIRED_NOTICE } from '../auth-route'
import { authDialog, isDesktopViewport } from '../hooks/use-auth-dialog'

/**
 * Reage ao 401 `session_expired` (a sessão já foi limpa pelo bridge): no desktop abre o modal de
 * login com o aviso, mantendo o usuário na tela; no mobile vai para `/entrar` com `redirect` =
 * rota + search atuais. Em ambos, depois de entrar, o fluxo volta ao ponto em que parou.
 */
export function SessionExpiredHandler() {
  const router = useRouter()

  useSessionExpiredListener(() => {
    const { pathname, href } = router.state.location
    if (pathname === '/entrar' || pathname === '/cadastro') return
    if (isDesktopViewport()) {
      authDialog.open('login', SESSION_EXPIRED_NOTICE)
      return
    }
    void router.navigate({ to: '/entrar', search: { redirect: href, motivo: 'sessao-expirada' } })
  })

  return null
}
