import { Link, useRouterState } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button-variants'
import { EmptyState } from './states'

/**
 * Tela privada cujo dado voltou 401 (sessão vencida): no lugar do "Verifique sua conexão", que era
 * enganoso, convida a entrar e voltar para cá. No desktop `/entrar` vira o modal, com o `redirect`.
 */
export function SessionExpiredState({ description = 'Entre novamente para continuar.' }: { description?: string }) {
  const href = useRouterState({ select: (state) => state.location.href })
  return (
    <EmptyState
      title="Sua sessão expirou"
      description={description}
      action={
        <Link to="/entrar" search={{ redirect: href }} className={buttonVariants({ size: 'lg' })}>
          Entrar
        </Link>
      }
    />
  )
}
