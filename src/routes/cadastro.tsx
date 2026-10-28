import { createFileRoute } from '@tanstack/react-router'
import { AuthPage } from '@/features/auth/components/auth-page'
import { authPageSearchSchema, skipIfAuthenticated } from '@/features/auth/auth-route'

export const Route = createFileRoute('/cadastro')({
  validateSearch: authPageSearchSchema,
  beforeLoad: skipIfAuthenticated,
  // Figma Mobile / Cadastro: tela cheia, sem tab bar
  staticData: { hideMobileTabBar: true },
  component: CadastroRoute,
})

function CadastroRoute() {
  const { redirect } = Route.useSearch()
  return <AuthPage mode="register" redirect={redirect} />
}
