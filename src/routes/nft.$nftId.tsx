import { createFileRoute } from '@tanstack/react-router'
import { nftQueries } from '@/features/nft/api/queries'
import { NftDetail } from '@/features/nft/components/nft-detail'

export const Route = createFileRoute('/nft/$nftId')({
  // Abaixo de md a barra de compra fixa ocupa o lugar da tab bar (Figma Mobile / Detalhes)
  staticData: { hideMobileTabBar: true },
  loader: ({ context: { queryClient }, params }) => {
    // Não bloqueia: o componente mostra skeleton, erro e 404 (D-04)
    void queryClient.ensureQueryData(nftQueries.detail(params.nftId)).catch(() => undefined)
  },
  component: NftRoute,
})

function NftRoute() {
  const { nftId } = Route.useParams()
  return <NftDetail key={nftId} nftId={nftId} />
}
