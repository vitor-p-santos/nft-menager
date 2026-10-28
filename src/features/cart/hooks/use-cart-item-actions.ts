import { useEffect, useState } from 'react'
import type { LiveFeedback } from '@/components/feedback/live-message'
import { toApiError } from '@/lib/api'
import { useRemoveCartItem, useUpdateCartItem } from '../api/queries'
import type { CartItem } from '../schemas/cart'

/** Botões "Remover" visíveis (tabela no desktop, cartões no mobile; a outra versão fica oculta). */
const visibleRemoveButtons = () =>
  [...document.querySelectorAll<HTMLButtonElement>('[data-cart-remove]')].filter((button) => button.getClientRects().length > 0)

/**
 * Depois de remover, o botão clicado some: o foco vai para o "Remover" que ficou na mesma posição (ou
 * no último item) e, com o carrinho vazio, para o título da página. Sem isso o foco caía no `body`.
 */
function focusAfterRemoval(position: number) {
  const buttons = visibleRemoveButtons()
  const target = buttons[Math.min(position, buttons.length - 1)]
  if (target) {
    target.focus()
    return
  }
  const heading = [...document.querySelectorAll<HTMLElement>('main h1')].find((h) => h.getClientRects().length > 0) ??
    document.querySelector<HTMLElement>('main h1')
  if (!heading) return
  heading.tabIndex = -1
  heading.focus()
}

/**
 * Alterar quantidade e remover itens: expõe qual item está pendente (para `aria-busy` e para
 * desabilitar os controles dele) e uma mensagem única para a região `aria-live` da tela.
 */
export function useCartItemActions() {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const [feedback, setFeedback] = useState<LiveFeedback>(null)
  // Posição do item removido (objeto novo a cada remoção): o foco muda depois do render que já
  // mostra o carrinho sem ele
  const [removal, setRemoval] = useState<{ position: number } | null>(null)
  useEffect(() => {
    if (removal) focusAfterRemoval(removal.position)
  }, [removal])

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
    const position = visibleRemoveButtons().findIndex((button) => button.dataset.cartRemove === item.id)
    remove.mutate(item.id, {
      onSuccess: () => {
        setFeedback({ tone: 'status', message: `${item.nft.name} foi removido do carrinho.` })
        setRemoval({ position: Math.max(position, 0) })
      },
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
