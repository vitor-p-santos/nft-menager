import { useRemoveWallet, useSetPrimaryWallet } from '../api'

/**
 * Ações rápidas de carteira para outras telas (menu ⋮ dos cartões do checkout mobile). A rota
 * compõe: `routes/checkout.tsx` passa estas funções ao checkout, que não importa a feature profile.
 * Devolvem a promise da mutation (o chamador mostra o erro); remover é otimista.
 */
export function useWalletActions() {
  const setPrimary = useSetPrimaryWallet()
  const remove = useRemoveWallet()
  return {
    setPrimary: (id: string) => setPrimary.mutateAsync(id),
    remove: (id: string) => remove.mutateAsync(id),
    isPending: setPrimary.isPending || remove.isPending,
  }
}
