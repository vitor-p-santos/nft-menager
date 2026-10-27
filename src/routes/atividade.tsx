import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth/auth-route'
import { orderListQuery } from '@/features/orders/api'
import { ActivityPage } from '@/features/orders/components/activity-page'
import { activitySearchSchema } from '@/features/orders/schemas/activity-search'

export const Route = createFileRoute('/atividade')({
  // Rota privada: sem sessão vai para /entrar?redirect=/atividade... e volta ao mesmo filtro/página
  beforeLoad: requireAuth,
  validateSearch: activitySearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) => {
    // Não bloqueia: a página mostra o skeleton e o próprio estado de erro (D-04)
    void queryClient.ensureQueryData(orderListQuery(deps)).catch(() => undefined)
  },
  component: AtividadeRoute,
})

function AtividadeRoute() {
  return <ActivityPage search={Route.useSearch()} />
}
