import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { cartSchema, type AddToCartInput, type Cart } from './schema'

/** Query keys do carrinho. Compartilhadas: `nft` adiciona itens, `cart` exibe e edita. */
export const cartKeys = {
  all: ['cart'] as const,
  detail: () => [...cartKeys.all, 'detail'] as const,
}

export const cartQueries = {
  get: () =>
    queryOptions({
      queryKey: cartKeys.detail(),
      queryFn: ({ signal }) => api.get('/cart', cartSchema, { signal }),
    }),
}

/** Grava no cache o Cart devolvido por qualquer mutation (o servidor é a fonte dos totais). */
export function useSetCart() {
  const queryClient = useQueryClient()
  return (cart: Cart) => queryClient.setQueryData(cartKeys.detail(), cart)
}

export function useAddToCart() {
  const setCart = useSetCart()
  return useMutation({
    mutationFn: (input: AddToCartInput) => api.post('/cart/items', input, cartSchema),
    onSuccess: setCart,
  })
}
