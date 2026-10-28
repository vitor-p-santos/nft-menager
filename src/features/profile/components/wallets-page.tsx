import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Skeleton } from '@/components/feedback/skeleton'
import { ErrorState } from '@/components/feedback/states'
import { SessionExpiredState } from '@/components/feedback/session-expired-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useCurrentUser, type User } from '@/entities/session'
import type { Wallet } from '@/entities/wallet'
import { isUnauthorizedError } from '@/lib/api'
import { getProfileFormErrors, useRemoveWallet, useSetPrimaryWallet, walletQueries } from '../api'
import { MAX_WALLETS } from '../schemas'
import { PrimaryWalletSection, SecondaryWalletsSection, type Adding } from './wallet-sections'

/** Estado da tela (formulário aberto, edição, remoção) e as ações; as seções só desenham. */
function WalletsContent({ user, wallets }: { user: User; wallets: Wallet[] }) {
  const primary = wallets.find((wallet) => wallet.role === 'primary') ?? null
  const secondaries = wallets.filter((wallet) => wallet !== primary)
  const atLimit = wallets.length >= MAX_WALLETS
  const [adding, setAdding] = useState<Adding>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toRemove, setToRemove] = useState<Wallet | null>(null)
  const [status, setStatus] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const setPrimary = useSetPrimaryWallet()
  const remove = useRemoveWallet()
  const busy = setPrimary.isPending || remove.isPending

  function announce(message: string) {
    setActionError(null)
    setStatus(message)
  }

  function onSavedNew(message: string) {
    setAdding(null)
    announce(message)
  }

  function makePrimary(wallet: Wallet) {
    setStatus('')
    setActionError(null)
    setPrimary.mutate(wallet.id, {
      onSuccess: () => announce(`${wallet.nickname} agora é a carteira principal.`),
      onError: (error) => setActionError(getProfileFormErrors(error, [] as const).form),
    })
  }

  function confirmRemove() {
    const wallet = toRemove
    if (!wallet) return
    setToRemove(null)
    setStatus('')
    setActionError(null)
    if (editingId === wallet.id) setEditingId(null)
    remove.mutate(wallet.id, {
      onSuccess: () =>
        announce(
          wallet.role === 'primary' && secondaries.length > 0
            ? `Carteira ${wallet.nickname} removida. A secundária mais antiga passou a ser a principal.`
            : `Carteira ${wallet.nickname} removida.`,
        ),
      onError: (error) => setActionError(getProfileFormErrors(error, [] as const).form),
    })
  }

  return (
    <div className="flex flex-col gap-12">
      <PrimaryWalletSection
        user={user}
        primary={primary}
        adding={adding}
        atLimit={atLimit}
        busy={busy}
        onAdd={() => setAdding('primary')}
        onCancelAdd={() => setAdding(null)}
        onSavedNew={onSavedNew}
        onSaved={announce}
        onRemove={setToRemove}
      />

      <SecondaryWalletsSection
        user={user}
        primary={primary}
        secondaries={secondaries}
        adding={adding}
        atLimit={atLimit}
        busy={busy}
        editingId={editingId}
        onAdd={() => setAdding('secondary')}
        onCancelAdd={() => setAdding(null)}
        onSavedNew={onSavedNew}
        onEdit={setEditingId}
        onSaved={announce}
        onMakePrimary={makePrimary}
        onRemove={setToRemove}
      />

      {actionError && (
        <p role="alert" className="text-body leading-5 text-destructive">
          {actionError}
        </p>
      )}
      <output aria-live="polite" className="text-body leading-5 text-success empty:hidden">
        {status}
      </output>

      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(open) => !open && setToRemove(null)}
        title="Remover carteira?"
        description={
          toRemove?.role === 'primary' && secondaries.length > 0
            ? `${toRemove.nickname} deixa de aparecer no pagamento. A carteira secundária mais antiga passa a ser a principal.`
            : `${toRemove?.nickname ?? 'A carteira'} deixa de aparecer no pagamento. Pedidos já feitos não mudam.`
        }
        confirmLabel="Remover carteira"
        onConfirm={confirmRemove}
        busy={remove.isPending}
      />
    </div>
  )
}

function WalletsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-[30px]">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-x-7 gap-y-6 md:grid-cols-2">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex flex-col gap-[7px]">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Tela "Carteiras" (`/perfil/carteiras`, T-086): principal editável, secundárias, adicionar e remover. */
export function WalletsPage() {
  const user = useCurrentUser()
  const wallets = useQuery({ ...walletQueries.list(), enabled: user !== null })
  if (user && wallets.data) return <WalletsContent user={user} wallets={wallets.data} />
  if (isUnauthorizedError(wallets.error)) return <SessionExpiredState description="Entre novamente para ver suas carteiras." />
  if (wallets.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar suas carteiras"
        description="Verifique sua conexão e tente novamente."
        action={{ label: 'Tentar novamente', onClick: () => void wallets.refetch() }}
      />
    )
  }
  return <WalletsSkeleton />
}
