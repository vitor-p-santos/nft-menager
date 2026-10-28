import { Link } from '@tanstack/react-router'
import { LogOutIcon, MapPinIcon, ReceiptTextIcon, UserIcon } from 'lucide-react'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { User } from '@/entities/session'
import { cn } from '@/lib/utils'
import { useLogout } from '../api'

function initials(user: User) {
  const name = user.displayName.trim() || user.username
  const parts = name.split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase()
}

/** Avatar do usuário (foto do perfil ou iniciais). Tamanho reservado para não deslocar o layout. */
export function UserAvatar({ user, size, className }: { user: User; size: number; className?: string }) {
  const [broken, setBroken] = useState(false)
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary bg-surface-raised text-caption font-bold text-text-accent',
        className,
      )}
    >
      {user.avatarUrl && !broken ? (
        <img src={user.avatarUrl} alt="" width={size} height={size} className="size-full object-cover" onError={() => setBroken(true)} />
      ) : (
        initials(user)
      )}
    </span>
  )
}

type AccountMenuProps = {
  user: User
  /** `header`: abre para baixo, alinhado à direita; `tabbar`: abre para cima. */
  placement: 'header' | 'tabbar'
  trigger: React.ReactNode
  triggerClassName?: string
}

/**
 * Menu da conta logada (sem frame no Figma: segue o dropdown "Criadores" do header). Mostra
 * nome e e-mail, "Meu perfil", "Carteiras", "Atividade" (pedidos, D-03/D-06) e "Sair".
 * O logout limpa o cache, o socket e o carrinho (`features/auth/api/session.ts`).
 */
export function AccountMenu({ user, placement, trigger, triggerClassName }: AccountMenuProps) {
  const logout = useLogout()
  // WCAG 2.5.3: no header, sem foto, o gatilho mostra as iniciais; o nome acessível precisa contê-las
  // (fora de parênteses: o axe descarta texto entre parênteses ao comparar)
  const showsInitials = placement === 'header' && !user.avatarUrl
  const label = `Conta de ${user.displayName || user.username}${showsInitials ? `, ${initials(user)}` : ''}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={label} className={cn('cursor-pointer', triggerClassName)}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side={placement === 'header' ? 'bottom' : 'top'}
        sideOffset={8}
        className="min-w-56 border-border bg-surface-card"
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-body font-bold text-foreground">{user.displayName || user.username}</span>
          <span className="truncate text-caption font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem asChild className="cursor-pointer text-body text-foreground">
          <Link to="/perfil">
            <UserIcon aria-hidden className="size-4 text-text-accent" />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer text-body text-foreground">
          <Link to="/perfil/carteiras">
            <MapPinIcon aria-hidden className="size-4 text-text-accent" />
            Carteiras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer text-body text-foreground">
          <Link to="/atividade">
            <ReceiptTextIcon aria-hidden className="size-4 text-text-accent" />
            Atividade
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={logout.isPending}
          onSelect={() => logout.mutate()}
          className="cursor-pointer text-body text-foreground"
        >
          <LogOutIcon aria-hidden className="size-4 text-text-accent" />
          {logout.isPending ? 'Saindo...' : 'Sair'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
