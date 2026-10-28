import { Link, useCanGoBack, useRouter } from '@tanstack/react-router'
import { ChevronDownIcon, HeartIcon, LogOutIcon, MapPinIcon, ShoppingCartIcon, UserIcon, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import arrowBack from '@/assets/icons/arrow-back.svg'
import { Container } from '@/components/layout/container'
import { cn } from '@/lib/utils'

export type ProfileSection = 'dados' | 'carteiras' | 'favoritos'

const SECTION_TITLES: Record<ProfileSection, string> = { dados: 'Dados do perfil', carteiras: 'Carteiras', favoritos: 'Lista de interesse' }

type MenuLink = { label: string; icon: LucideIcon } & (
  | { kind: 'section'; section: ProfileSection; to: '/perfil' | '/perfil/carteiras' | '/perfil/lista-de-interesse' }
  | { kind: 'route'; to: '/atividade' }
)

/**
 * Itens do menu lateral (Figma Desktop/Perfil `9:1238`). "Ofertas", "Arquivos baixados" e "Suporte"
 * ficam ocultos (D-06); "Lista de interesse" é a lista de favoritos.
 * Ícones provisórios do lucide (os vetores do Figma ainda não foram baixados).
 */
const MENU: MenuLink[] = [
  { label: 'Dados do perfil', icon: UserIcon, kind: 'section', section: 'dados', to: '/perfil' },
  { label: 'Carteiras', icon: MapPinIcon, kind: 'section', section: 'carteiras', to: '/perfil/carteiras' },
  { label: 'Atividade', icon: ShoppingCartIcon, kind: 'route', to: '/atividade' },
  { label: 'Lista de interesse', icon: HeartIcon, kind: 'section', section: 'favoritos', to: '/perfil/lista-de-interesse' },
]

const itemClass = 'flex h-[45px] w-full items-center gap-[15px] pr-4 pl-[15px] text-left text-body-md leading-5 text-text-accent'

function MenuItems({ current }: { current: ProfileSection }) {
  return (
    <ul className="flex flex-col">
      {MENU.map((item) => {
        const icon = <item.icon aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
        const active = item.kind === 'section' && item.section === current
        return (
          <li key={item.label}>
            <Link
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cn(itemClass, 'relative rounded-sm transition-colors hover:text-foreground')}
            >
              {/* Item ativo: barra âmbar de 6px à esquerda */}
              {active && <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-primary" />}
              {icon}
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** "Sair": o botão vem da rota (feature auth), com o ícone e o estilo do menu. */
function SignOutItem({ signOut }: { signOut: (props: { className: string; children: ReactNode }) => ReactNode }) {
  return (
    <div className="mt-[7px] border-t border-border pt-[7px]">
      {signOut({
        className: cn(itemClass, 'cursor-pointer font-bold hover:text-foreground disabled:cursor-wait'),
        children: (
          <>
            <LogOutIcon aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
            Sair
          </>
        ),
      })}
    </div>
  )
}

function BackButton() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => (canGoBack ? router.history.back() : void router.navigate({ to: '/' }))}
      className="absolute left-0 flex size-[35px] cursor-pointer items-center justify-center rounded-full border border-border bg-surface-raised"
    >
      <img src={arrowBack} alt="" width={13} height={7} className="rotate-90" />
    </button>
  )
}

type ProfileShellProps = {
  current: ProfileSection
  /** Botão "Sair" (composto pela rota com a feature auth). */
  signOut: (props: { className: string; children: ReactNode }) => ReactNode
  children: ReactNode
}

/**
 * Moldura das telas da conta (Figma Desktop/Perfil `9:1238` e Carteiras `9:1670`): menu lateral
 * "Meu perfil" de 310px em Surface Card e o conteúdo à direita (gap de 28px).
 * Abaixo de `xl` (D-02, sem frame mobile): título com voltar no topo e o menu vira um acordeão
 * recolhido acima do formulário, que passa a uma coluna no mobile.
 */
export function ProfileShell({ current, signOut, children }: ProfileShellProps) {
  const title = SECTION_TITLES[current]
  return (
    <Container className="flex flex-col gap-6 pt-[30px] md:pt-8 xl:flex-row xl:items-start xl:gap-7">
      <div className="relative flex h-[35px] items-center justify-center md:hidden">
        <BackButton />
        <h1 className="text-title-sm leading-6 font-bold text-foreground">{title}</h1>
      </div>
      <h1 className="sr-only max-md:hidden">{title}</h1>

      {/* Desktop: menu lateral fixo */}
      <nav aria-label="Meu perfil" className="hidden w-[310px] shrink-0 bg-surface-card pt-[18px] pb-[18px] xl:block">
        <p aria-hidden className="mb-1.5 px-2.5 text-lead leading-6 font-bold text-foreground">
          Meu perfil
        </p>
        <MenuItems current={current} />
        <SignOutItem signOut={signOut} />
      </nav>

      {/* Mobile/tablet: o mesmo menu como acordeão (D-02) */}
      <details className="group bg-surface-card xl:hidden">
        <summary className="flex h-[50px] cursor-pointer list-none items-center justify-between gap-3 px-[15px] text-body-md leading-5 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="font-bold text-foreground">Meu perfil</span>
            <span className="text-text-secondary"> · {title}</span>
          </span>
          <ChevronDownIcon aria-hidden className="size-4 text-text-accent transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <nav aria-label="Meu perfil" className="pb-2">
          <MenuItems current={current} />
          <SignOutItem signOut={signOut} />
        </nav>
      </details>

      <div className="min-w-0 flex-1">{children}</div>
    </Container>
  )
}
