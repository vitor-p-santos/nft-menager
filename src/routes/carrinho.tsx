import { createFileRoute } from '@tanstack/react-router'
import { cartQueries } from '@/features/cart/api/queries'
import { CartPage } from '@/features/cart/components/cart-page'
import { RelatedNfts } from '@/features/nft/components/related-nfts'

export const Route = createFileRoute('/carrinho')({
  // Figma Mobile / Carrinho: sem tab bar; o resumo fica preso ao rodapé
  staticData: { hideMobileTabBar: true },
  loader: ({ context: { queryClient } }) => {
    void queryClient.ensureQueryData(cartQueries.get()).catch(() => undefined)
  },
  component: CarrinhoRoute,
})

function CarrinhoRoute() {
  return (
    <CartPage
      related={(cart) => {
        const first = cart.items[0]
        if (!first) return null
        return (
          <RelatedNfts
            nftId={first.nftId}
            title="Colecionadores também viram"
            excludeIds={cart.items.map((item) => item.nftId)}
          />
        )
      }}
    />
  )
}
