import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth/auth-route'
import { SignOutButton } from '@/features/auth/components/sign-out-button'
import { walletQueries } from '@/features/profile/api'
import { ProfileShell } from '@/features/profile/components/profile-shell'
import { WalletsPage } from '@/features/profile/components/wallets-page'

export const Route = createFileRoute('/perfil/carteiras')({
  // Rota privada: sem sessão vai para /entrar?redirect=/perfil/carteiras e volta para cá
  beforeLoad: requireAuth,
  loader: ({ context: { queryClient } }) => {
    void queryClient.ensureQueryData(walletQueries.list()).catch(() => undefined)
  },
  component: CarteirasRoute,
})

function CarteirasRoute() {
  return (
    <ProfileShell current="carteiras" signOut={(props) => <SignOutButton {...props} />}>
      <WalletsPage />
    </ProfileShell>
  )
}
