import { useState } from 'react'
import type { LiveFeedback } from '@/components/feedback/live-message'
import { toApiError } from '@/lib/api'
import { useRemoveCartItem, useUpdateCartItem } from '../api/queries'
import type { CartItem } from '../schemas/cart'

/**
 * Alterar quantidade e remover itens: expõe qual item está pendente (para `aria-busy` e para
 * desabilitar os controles dele) e uma mensagem única para a região `aria-live` da tela.
 */
export function useCartItemActions() {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const [feedback, setFeedback] = useState<LiveFeedback>(null)

  function changeQuantity(item: CartItem, quantity: number) {
    setFeedback(null)
    update.mutate(
      { itemId: item.id, quantity },
      {
        onError: (error) =>
          setFeedback({
            tone: 'error',
            message: `Não foi possível alterar a quantidade de ${item.nft.name}. ${toApiError(error).message}`,
          }),
      },
    )
  }

  function removeItem(item: CartItem) {
    setFeedback(null)
    remove.mutate(item.id, {
      onSuccess: () => setFeedback({ tone: 'status', message: `${item.nft.name} foi removido do carrinho.` }),
      onError: (error) =>
        setFeedback({
          tone: 'error',
          message: `Não foi possível remover ${item.nft.name}. ${toApiError(error).message}`,
        }),
    })
  }

  /** Quantidade exibida: a pedida enquanto a mutation roda, depois a do servidor. */
  function displayQuantity(item: CartItem) {
    return update.isPending && update.variables.itemId === item.id ? update.variables.quantity : item.quantity
  }

  function isPending(item: CartItem) {
    return (
      (update.isPending && update.variables.itemId === item.id) || (remove.isPending && remove.variables === item.id)
    )
  }

  return { changeQuantity, removeItem, displayQuantity, isPending, feedback }
}

export type CartItemActions = ReturnType<typeof useCartItemActions>
