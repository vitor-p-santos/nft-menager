import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import tabbarBg from '@/assets/decor/tabbar-bg.svg'
import tabbarCenter from '@/assets/decor/tabbar-center.svg'
import tabCart from '@/assets/icons/tab-cart.svg'
import tabHeart from '@/assets/icons/tab-heart.svg'
import tabHome from '@/assets/icons/tab-home.svg'
import tabScan from '@/assets/icons/tab-scan.svg'
import tabUser from '@/assets/icons/tab-user.svg'
import { CATALOG_SEARCH_INPUT_ID, CATALOG_SECTION_ID } from '@/entities/catalog'
import { useCurrentUser } from '@/entities/session'
import { AccountMenu } from '@/features/auth/components/account-menu'

const TAB_CLASS = 'absolute top-[71px] flex size-10 -translate-x-1/2 -translate-y-2.5 items-center justify-center'

/**
 * "Conta": sem sessão leva a `/entrar` com `redirect` para voltar à tela atual; com sessão abre o
 * menu da conta (nome, e-mail e "Sair") para cima.
 */
function AccountTab() {
  const user = useCurrentUser()
  const href = useRouterState({ select: (state) => state.location.href })
  const icon = <img src={tabUser} alt="" width={20} height={20} />
  if (user) {
    return <AccountMenu user={user} placement="tabbar" trigger={icon} triggerClassName={`${TAB_CLASS} left-[87.9%]`} />
  }
  return (
    <Link to="/entrar" search={{ redirect: href }} aria-label="Entrar na conta" className={`${TAB_CLASS} left-[87.9%]`}>
      {icon}
    </Link>
  )
}

/**
 * Tab bar mobile (Figma "Tab Bar", 414×126). Posições horizontais em % da largura do frame
 * para escalar de 414 para 390px. O botão central leva à busca do catálogo (research.md, D-09).
 */
export function MobileTabBar() {
  const navigate = useNavigate()

  async function openSearch() {
    await navigate({ to: '/', search: (prev) => prev, hash: CATALOG_SECTION_ID })
    const input = document.getElementById(CATALOG_SEARCH_INPUT_ID)
    input?.focus()
    input?.scrollIntoView({ block: 'center' })
  }

  return (
    <nav aria-label="Navegação inferior" className="fixed inset-x-0 bottom-0 z-40 h-[126px] md:hidden">
      <div className="pointer-events-none absolute inset-x-0 top-[31px] bottom-0">
        <img src={tabbarBg} alt="" className="absolute -top-10 -left-[7.25%] h-[calc(100%+60px)] w-[114.5%] max-w-none" />
      </div>
      <Link
        to="/"
        aria-label="Início"
        activeOptions={{ exact: true, includeHash: false }}
        className="absolute top-[71px] left-[11.1%] flex size-10 -translate-x-1/2 -translate-y-2.5 items-center justify-center"
      >
        <img src={tabHome} alt="" width={16} height={17} />
      </Link>
      {/* Favoritos = Lista de interesse (rota privada: sem sessão, /entrar com redirect) */}
      <Link
        to="/perfil/lista-de-interesse"
        aria-label="Favoritos"
        className={`${TAB_CLASS} left-[28.5%]`}
      >
        <img src={tabHeart} alt="" width={20} height={18} />
      </Link>
      <button
        type="button"
        aria-label="Buscar no catálogo"
        onClick={() => void openSearch()}
        className="absolute top-0 left-1/2 size-[65px] -translate-x-1/2 cursor-pointer"
      >
        <img src={tabbarCenter} alt="" width={65} height={65} className="absolute inset-0" />
        <img src={tabScan} alt="" width={27} height={24} className="absolute top-[21px] left-[19px]" />
      </button>
      <Link
        to="/carrinho"
        aria-label="Carrinho"
        className="absolute top-[71px] left-[72.9%] flex size-10 -translate-x-1/2 -translate-y-2.5 items-center justify-center"
      >
        <img src={tabCart} alt="" width={20} height={20} />
      </Link>
      <AccountTab />
    </nav>
  )
}
