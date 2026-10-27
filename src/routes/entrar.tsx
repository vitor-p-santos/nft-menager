import { createFileRoute } from '@tanstack/react-router'
import { AuthPage } from '@/features/auth/components/auth-page'
import { authPageSearchSchema, SESSION_EXPIRED_NOTICE, skipIfAuthenticated } from '@/features/auth/auth-route'

export const Route = createFileRoute('/entrar')({
  validateSearch: authPageSearchSchema,
  beforeLoad: skipIfAuthenticated,
  // Figma Mobile / Login: tela cheia, sem tab bar
  staticData: { hideMobileTabBar: true },
  component: EntrarRoute,
})

function EntrarRoute() {
  const { redirect, motivo } = Route.useSearch()
  return <AuthPage mode="login" redirect={redirect} notice={motivo ? SESSION_EXPIRED_NOTICE : undefined} />
}
