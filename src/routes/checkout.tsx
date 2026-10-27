import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth/auth-route'
import { CheckoutPage } from '@/features/checkout/components/checkout-page'
import { useWalletActions } from '@/features/profile/hooks/use-wallet-actions'

export const Route = createFileRoute('/checkout')({
  // Rota privada: sem sessão vai para /entrar?redirect=/checkout e volta para cá depois do login
  beforeLoad: requireAuth,
  // Figma Mobile / Pagamento: tela própria (voltar + título), sem tab bar
  staticData: { hideMobileTabBar: true },
  component: CheckoutRoute,
})

function CheckoutRoute() {
  // Menu ⋮ das carteiras salvas (mobile): definir principal e remover vêm da feature profile
  const walletActions = useWalletActions()
  return <CheckoutPage walletActions={walletActions} />
}
