import { useMutation } from '@tanstack/react-query'
import { useSetCart } from '@/entities/cart'
import { api, http } from '@/lib/api'
import { cartSchema, couponInputSchema, type CouponInput } from '../schemas/cart'

export { cartKeys, cartQueries, useAddToCart } from '@/entities/cart'

const itemPath = (itemId: string) => `/cart/items/${encodeURIComponent(itemId)}`

export function useUpdateCartItem() {
  const setCart = useSetCart()
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api.patch(itemPath(itemId), { quantity }, cartSchema),
    onSuccess: setCart,
  })
}

export function useRemoveCartItem() {
  const setCart = useSetCart()
  return useMutation({
    mutationFn: async (itemId: string) => cartSchema.parse((await http.delete<unknown>(itemPath(itemId))).data),
    onSuccess: setCart,
  })
}

export function useApplyCoupon() {
  const setCart = useSetCart()
  return useMutation({
    mutationFn: (input: CouponInput) => api.post('/cart/coupon', couponInputSchema.parse(input), cartSchema),
    onSuccess: setCart,
  })
}

export function useRemoveCoupon() {
  const setCart = useSetCart()
  return useMutation({
    mutationFn: async () => cartSchema.parse((await http.delete<unknown>('/cart/coupon')).data),
    onSuccess: setCart,
  })
}
