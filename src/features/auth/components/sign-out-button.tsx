import { useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useLogout } from '../api'

/**
 * "Sair" fora do menu da conta (menu lateral do perfil). Depois do logout vai para o Início, porque
 * as telas onde ele aparece são privadas. Composto pela rota (a feature profile não importa auth).
 */
export function SignOutButton({ className, children }: { className?: string; children: ReactNode }) {
  const logout = useLogout()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      disabled={logout.isPending}
      // Promise (e não callback do `mutate`): navega mesmo se o botão desmontar durante o logout
      onClick={() => void logout.mutateAsync().catch(() => undefined).finally(() => void navigate({ to: '/' }))}
      className={className}
    >
      {children}
      {logout.isPending && <span className="sr-only"> (saindo)</span>}
    </button>
  )
}
