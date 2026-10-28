import { useRouter } from '@tanstack/react-router'
import { useSessionExpiredListener } from '../api'
import { isPrivateMatch, SESSION_EXPIRED_NOTICE } from '../auth-route'
import { authDialog, isDesktopViewport } from '../hooks/use-auth-dialog'

/**
 * Reage ao 401 `session_expired` (a sessão já foi limpa pelo bridge). Depois de entrar, o fluxo
 * volta ao ponto em que parou:
 * - tela pública no desktop (ex.: detalhe do NFT): abre o modal de login com o aviso, na própria tela;
 * - tela privada (perfil, checkout, pedidos) ou mobile: vai para `/entrar` com `redirect` e o aviso.
 *   No desktop `/entrar` vira o modal sobre o mercado. Antes, a tela privada ficava atrás do modal em
 *   skeleton para sempre (sem sessão as queries dela não rodam).
 */
export function SessionExpiredHandler() {
  const router = useRouter()

  useSessionExpiredListener(() => {
    const { pathname, href } = router.state.location
    if (pathname === '/entrar' || pathname === '/cadastro') return
    const onPrivateRoute = isPrivateMatch(router.state.matches.map((match) => router.routesById[match.routeId].options))
    if (isDesktopViewport() && !onPrivateRoute) {
      authDialog.open('login', SESSION_EXPIRED_NOTICE)
      return
    }
    void router.navigate({ to: '/entrar', search: { redirect: href, motivo: 'sessao-expirada' } })
  })

  return null
}
