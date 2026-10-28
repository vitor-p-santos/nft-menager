import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth/auth-route'
import { SignOutButton } from '@/features/auth/components/sign-out-button'
import { profileQueries } from '@/features/profile/api'
import { ProfilePage } from '@/features/profile/components/profile-page'
import { ProfileShell } from '@/features/profile/components/profile-shell'

export const Route = createFileRoute('/perfil/')({
  // Rota privada: sem sessão vai para /entrar?redirect=/perfil e volta para cá
  beforeLoad: requireAuth,
  loader: ({ context: { queryClient } }) => {
    // Não bloqueia: a página mostra o skeleton e o próprio estado de erro
    void queryClient.ensureQueryData(profileQueries.detail()).catch(() => undefined)
  },
  component: PerfilRoute,
})

function PerfilRoute() {
  return (
    <ProfileShell current="dados" signOut={(props) => <SignOutButton {...props} />}>
      <ProfilePage />
    </ProfileShell>
  )
}
