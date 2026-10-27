import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth/auth-route'
import { SignOutButton } from '@/features/auth/components/sign-out-button'
import { favoritesQueries } from '@/features/nft/api/queries'
import { FavoritesPage } from '@/features/nft/components/favorites-page'
import { ProfileShell } from '@/features/profile/components/profile-shell'

export const Route = createFileRoute('/perfil/lista-de-interesse')({
  // Rota privada: sem sessão vai para /entrar?redirect=/perfil/lista-de-interesse e volta para cá
  beforeLoad: requireAuth,
  loader: ({ context: { queryClient } }) => {
    void queryClient.ensureQueryData(favoritesQueries.list()).catch(() => undefined)
  },
  component: ListaDeInteresseRoute,
})

function ListaDeInteresseRoute() {
  return (
    <ProfileShell current="favoritos" signOut={(props) => <SignOutButton {...props} />}>
      <FavoritesPage />
    </ProfileShell>
  )
}
