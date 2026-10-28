import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { LiveFeedback } from '@/components/feedback/live-message'
import { useAddToCart } from '@/entities/cart'
import type { Edition, Nft } from '@/entities/nft'
import { toApiError } from '@/lib/api'

/**
 * Compra no detalhe: edição (começa na primeira disponível) e quantidade (1 até `available`, limitada
 * também quando a disponibilidade muda após um refetch) ficam no estado da tela.
 * "Comprar" adiciona ao carrinho e abre a tela do carrinho (o checkout parte dele); o botão de
 * carrinho só adiciona e anuncia o resultado. Erros (ex.: 409 sem estoque) também são anunciados.
 */
export function useNftPurchase(nft: Nft) {
  const [edition, setEdition] = useState<Edition | null>(() => nft.editions.find((e) => e.available > 0)?.edition ?? null)
  const [quantity, setQuantity] = useState(1)
  const available = nft.editions.find((e) => e.edition === edition)?.available ?? 0
  // Limita também quando a disponibilidade muda após um refetch
  const qty = Math.min(Math.max(quantity, 1), Math.max(available, 1))

  const add = useAddToCart()
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState<LiveFeedback>(null)

  function changeEdition(next: Edition) {
    setEdition(next)
    const max = nft.editions.find((e) => e.edition === next)?.available ?? 1
    setQuantity((q) => Math.min(Math.max(q, 1), Math.max(max, 1)))
  }

  function addToCart(goToCart: boolean) {
    if (!edition || add.isPending) return
    setFeedback(null)
    add.mutate(
      { nftId: nft.id, edition, quantity: qty },
      {
        onSuccess: () => {
          if (goToCart) void navigate({ to: '/carrinho' })
          else setFeedback({ tone: 'status', message: `${nft.name} foi adicionado ao carrinho.` })
        },
        onError: (error) =>
          setFeedback({ tone: 'error', message: `Não foi possível adicionar ao carrinho. ${toApiError(error).message}` }),
      },
    )
  }

  return {
    edition,
    changeEdition,
    quantity: qty,
    setQuantity,
    available,
    soldOut: available === 0,
    addToCart,
    isPending: add.isPending,
    feedback,
  }
}

export type NftPurchase = ReturnType<typeof useNftPurchase>
