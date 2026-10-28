import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import headerDivider from '@/assets/decor/header-divider.svg'
import navUnderline from '@/assets/decor/nav-underline.svg'
import cartIcon from '@/assets/icons/cart.svg'
import loginIcon from '@/assets/icons/login.svg'
import searchIcon from '@/assets/icons/search.svg'
import { Container } from '@/components/layout/container'
import { Logo } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cartQueries } from '@/entities/cart'
import { CATALOG_SECTION_ID } from '@/entities/catalog'
import { useCurrentUser } from '@/entities/session'
import { AccountMenu, UserAvatar } from '@/features/auth/components/account-menu'
import { authDialog } from '@/features/auth/hooks/use-auth-dialog'
import { catalogQueries } from '@/features/catalog/api/queries'
import { cn } from '@/lib/utils'

/** Rotas do fluxo "Mercado" (detalhe, carrinho, pagamento) — o Figma ativa "Mercado" nelas. */
const MARKET_PATHS = ['/nft', '/carrinho', '/checkout']

function NavItem({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span className="flex flex-col gap-6">
      <span className={cn('text-body-lg leading-normal', active ? 'font-bold text-text-accent' : 'text-foreground')}>
        {children}
      </span>
      {/* Sublinhado ativo (3px) — asset do Figma, mantido no fluxo para não deslocar o layout */}
      <img src={navUnderline} alt="" aria-hidden width={58} height={3} className={cn('h-[3px] w-full', !active && 'invisible')} />
    </span>
  )
}

function HeaderSearch() {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()
  const inputId = useId()

  // Foca o campo ao abrir pela ação explícita do usuário (substitui autoFocus)
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  /**
   * Fecha a busca (Esc ou envio) e devolve o foco ao botão que a abriu: o campo sai do DOM.
   * Sem rolar: no envio a navegação leva ao catálogo, que fica abaixo do header.
   */
  function close() {
    setOpen(false)
    toggleRef.current?.focus({ preventScroll: true })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = new FormData(event.currentTarget).get('q')?.toString().trim()
    void navigate({ to: '/', search: (prev) => ({ ...prev, q: q || undefined, page: undefined }), hash: CATALOG_SECTION_ID })
    close()
  }

  return (
    <div className="relative flex items-center">
      {open && (
        <search className="absolute right-8 w-64">
          <form onSubmit={submit}>
            <label htmlFor={inputId} className="sr-only">
              Buscar NFTs
            </label>
            <input
              ref={inputRef}
              id={inputId}
              name="q"
              type="search"
              placeholder="Buscar NFTs..."
              onKeyDown={(e) => e.key === 'Escape' && close()}
              className="h-[35px] w-full rounded-md border border-border bg-surface-card px-3 text-body text-foreground placeholder:text-secondary"
            />
          </form>
        </search>
      )}
      <button
        ref={toggleRef}
        type="button"
        aria-label={open ? 'Fechar busca' : 'Abrir busca'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-6 items-center justify-center"
      >
        <img src={searchIcon} alt="" width={20} height={20} />
      </button>
    </div>
  )
}

function CreatorsMenu() {
  // Os facets do catálogo já trazem a lista de criadores (cache compartilhado com a Home)
  const { data } = useQuery(catalogQueries.list({}))
  const creators = data?.facets.creators ?? []
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer">
        <NavItem active={false}>Criadores</NavItem>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="border-border bg-surface-card">
        {creators.map((creator) => (
          <DropdownMenuItem key={creator.id} asChild>
            <Link to="/" search={{ creator: creator.id }} hash={CATALOG_SECTION_ID} className="text-body text-foreground">
              {creator.label}
              <span className="ml-auto text-muted-foreground">({creator.count})</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Carrinho com o contador de unidades (Figma: círculo âmbar de 16px no canto do ícone). */
function CartLink() {
  const { data: count = 0 } = useQuery({ ...cartQueries.get(), select: (cart) => cart.itemCount })
  const label = count > 0 ? `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'
  return (
    <Link to="/carrinho" aria-label={label} className="relative h-6 w-[31px] rounded-sm">
      <img src={cartIcon} alt="" width={24} height={24} className="absolute top-0 left-0" />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-1.5 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-micro leading-none font-bold text-primary-foreground tabular-nums"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}

/**
 * "Entrar" abre o modal de autenticação (Figma Sign In Modal). Com sessão, o mesmo espaço vira o
 * avatar com o menu da conta (sem frame no Figma; ver ARCHITECTURE.md).
 */
function AccountSlot() {
  const user = useCurrentUser()
  if (user) {
    return (
      <AccountMenu
        user={user}
        placement="header"
        triggerClassName="rounded-full"
        trigger={<UserAvatar user={user} size={35} />}
      />
    )
  }
  return (
    <Button size="md" onClick={() => authDialog.open('login')} aria-haspopup="dialog" className="w-[100px]">
      <img src={loginIcon} alt="" width={20} height={20} className="p-[2px]" />
      Entrar
    </Button>
  )
}

/**
 * Header desktop (Figma "Header Row" + "Header With Divider"). As telas do fluxo de mercado
 * usam a variante sem divisor e com "Mercado" ativo.
 */
export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isMarket = MARKET_PATHS.some((p) => pathname.startsWith(p))
  const isHome = pathname === '/'

  return (
    <header className="hidden pt-6 md:block">
      <Container>
        <div className="flex items-start justify-between gap-6">
          <div className="w-[160px] pt-2 md:w-auto xl:w-[160px]">
            <Logo />
          </div>
          <nav aria-label="Principal" className="flex items-start gap-6 xl:gap-10">
            <Link to="/" aria-current={isHome ? 'page' : undefined}>
              <NavItem active={isHome}>Início</NavItem>
            </Link>
            <Link to="/" hash={CATALOG_SECTION_ID} aria-current={isMarket ? 'page' : undefined}>
              <NavItem active={isMarket}>Mercado</NavItem>
            </Link>
            <CreatorsMenu />
            <Link to="/" hash="diario">
              <NavItem active={false}>Aprenda</NavItem>
            </Link>
          </nav>
          <div className="flex items-center gap-7">
            <HeaderSearch />
            <CartLink />
            <AccountSlot />
          </div>
        </div>
        {!isMarket && <img src={headerDivider} alt="" aria-hidden width={1200} height={1} className="block h-px w-full" />}
      </Container>
    </header>
  )
}
