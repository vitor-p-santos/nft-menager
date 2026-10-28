import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { walletKeys, walletListSchema, walletSchema, type Wallet } from '@/entities/wallet'
import { api, http } from '@/lib/api'
import { createWalletRequestSchema, walletInputSchema, type CreateWalletRequest, type UpdateWalletRequest } from '../schemas'
import { profileKeys } from './keys'

export { walletKeys, walletQueries } from '@/entities/wallet'

const walletPath = (id: string) => `/me/wallets/${encodeURIComponent(id)}`

/**
 * Toda mudança de carteira invalida a lista (o checkout usa a mesma `walletKeys.list()`) e o perfil
 * (`walletNickname` é o apelido da principal).
 */
function invalidateWallets(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: walletKeys.all })
  void queryClient.invalidateQueries({ queryKey: profileKeys.all })
}

/**
 * "Adicionar"/"Salvar carteira" (`POST /me/wallets` → 201). `makePrimary: true` torna a nova a
 * principal; a 1ª carteira sempre é. Erros: 422 `validation_error` (por campo),
 * 422 `wallet_limit_reached`, 409 `wallet_exists` (`address`).
 */
export function useCreateWallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateWalletRequest) =>
      api.post('/me/wallets', createWalletRequestSchema.parse(request), walletSchema),
    onSuccess: () => invalidateWallets(queryClient),
  })
}

/**
 * Editar (`PATCH /me/wallets/:id`), inclusive só o apelido: `{ id, values: { nickname } }`.
 * Com o formulário inteiro, envie todos os campos (validados pelo mesmo schema do servidor).
 */
export function useUpdateWallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateWalletRequest }) => {
      const body = isComplete(values) ? walletInputSchema.parse(values) : values
      return api.patch(walletPath(id), body, walletSchema)
    },
    onSuccess: () => invalidateWallets(queryClient),
  })
}

/** Formulário completo (tem rede e endereço): dá para validar no client antes de enviar. */
const isComplete = (values: UpdateWalletRequest) => values.network !== undefined && values.address !== undefined

/**
 * Remover (`DELETE /me/wallets/:id` → 204). Se era a principal, o servidor promove a secundária
 * mais antiga (a lista é recarregada). A carteira some do cache na hora (otimista).
 */
export function useRemoveWallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await http.delete(walletPath(id))
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: walletKeys.list() })
      const previous = queryClient.getQueryData<Wallet[]>(walletKeys.list())
      if (previous) queryClient.setQueryData(walletKeys.list(), previous.filter((w) => w.id !== id))
      return { previous }
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(walletKeys.list(), context.previous)
    },
    onSettled: () => invalidateWallets(queryClient),
  })
}

/** "Definir como principal" (`POST /me/wallets/:id/primary` → lista atualizada, principal primeiro). */
export function useSetPrimaryWallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`${walletPath(id)}/primary`, null, walletListSchema),
    onSuccess: (list) => {
      queryClient.setQueryData(walletKeys.list(), list)
      void queryClient.invalidateQueries({ queryKey: profileKeys.all })
    },
  })
}
