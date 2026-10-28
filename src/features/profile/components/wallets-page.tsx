import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { Skeleton } from '@/components/feedback/skeleton'
import { ErrorState } from '@/components/feedback/states'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { NETWORK_LABELS } from '@/entities/nft'
import { useCurrentUser, type User } from '@/entities/session'
import { shortAddress, WALLET_PROVIDER_LABELS, type Wallet } from '@/entities/wallet'
import { cn } from '@/lib/utils'
import { getProfileFormErrors, useRemoveWallet, useSetPrimaryWallet, walletQueries } from '../api'
import { MAX_WALLETS, newWalletFormDefaults, walletToFormValues, type WalletFormValues } from '../schemas'
import { WalletForm } from './wallet-form'

/** Selects começam em "Selecione…" (valor vazio), não na primeira opção. */
function withEmptySelects(values: WalletFormValues): WalletFormValues {
  return {
    ...values,
    network: values.network ?? ('' as WalletFormValues['network']),
    provider: values.provider ?? ('' as WalletFormValues['provider']),
  }
}

/**
 * "Igual à carteira principal" (Figma d-09, sem endpoint): a nova secundária herda os dados do
 * colecionador da principal (nome de exibição, nome do perfil, rede, tipo, e-mail e código de
 * indicação). Endereço, apelido e ENS ficam em branco: copiar o endereço daria 409 `wallet_exists`.
 * Decisão em ARCHITECTURE.md → "Perfil e carteiras: telas".
 */
function sameAsPrimaryDefaults(primary: Wallet): WalletFormValues {
  return {
    ...walletToFormValues(primary),
    label: '',
    nickname: '',
    address: '',
    secondaryWallet: '',
    ensName: '',
  }
}

const sectionTitle = 'text-body-lg leading-5 font-bold text-foreground'
const linkButton = 'cursor-pointer rounded-sm text-body-lg leading-5 font-bold text-text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline'
const textButton = 'cursor-pointer rounded-sm text-body leading-4 text-foreground hover:text-text-accent disabled:cursor-not-allowed disabled:opacity-50'

type Adding = null | 'primary' | 'secondary'

function SecondaryWalletCard({
  wallet,
  editing,
  onEdit,
  onCancelEdit,
  onSaved,
  onMakePrimary,
  onRemove,
  busy,
}: {
  wallet: Wallet
  editing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSaved: (message: string) => void
  onMakePrimary: () => void
  onRemove: () => void
  busy: boolean
}) {
  return (
    <li className="flex flex-col gap-5 bg-surface-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-body-lg leading-5 font-bold text-foreground">{wallet.nickname}</span>
          <span className="truncate text-body leading-5 text-text-secondary">
            {WALLET_PROVIDER_LABELS[wallet.provider]} · {NETWORK_LABELS[wallet.network]} · {wallet.ensName ?? shortAddress(wallet.address)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <button type="button" onClick={editing ? onCancelEdit : onEdit} aria-expanded={editing} className={textButton}>
            {editing ? 'Fechar edição' : 'Editar'}
            <span className="sr-only"> {wallet.nickname}</span>
          </button>
          <button type="button" onClick={onMakePrimary} disabled={busy} className={textButton}>
            Tornar principal
            <span className="sr-only"> {wallet.nickname}</span>
          </button>
          <button type="button" onClick={onRemove} disabled={busy} className={cn(textButton, 'text-destructive')}>
            Remover
            <span className="sr-only"> {wallet.nickname}</span>
          </button>
        </div>
      </div>
      {editing && (
        <WalletForm
          wallet={wallet}
          defaultValues={walletToFormValues(wallet)}
          legend={`Editar carteira ${wallet.nickname}`}
          onSaved={onSaved}
          onCancel={onCancelEdit}
        />
      )}
    </li>
  )
}

function WalletsContent({ user, wallets }: { user: User; wallets: Wallet[] }) {
  const id = useId()
  const primary = wallets.find((wallet) => wallet.role === 'primary') ?? null
  const secondaries = wallets.filter((wallet) => wallet !== primary)
  const atLimit = wallets.length >= MAX_WALLETS
  const [adding, setAdding] = useState<Adding>(null)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
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

  const limitHint = atLimit ? `Limite de ${MAX_WALLETS} carteiras atingido` : undefined

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby={`${id}-principal`} className="flex flex-col gap-[30px]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id={`${id}-principal`} className={sectionTitle}>
              Carteira principal
            </h2>
            <p className="text-caption-lg leading-4 text-text-accent">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
          </div>
          {primary && adding !== 'primary' && (
            <button type="button" onClick={() => setAdding('primary')} disabled={atLimit} title={limitHint} className={linkButton}>
              Adicionar
              <span className="sr-only"> carteira principal</span>
            </button>
          )}
        </div>
        {adding === 'primary' || !primary ? (
          <>
            {primary && <p className="text-body leading-5 text-text-secondary">A nova carteira passa a ser a principal; a atual vira secundária.</p>}
            <WalletForm
              key="nova-principal"
              wallet={null}
              defaultValues={withEmptySelects(newWalletFormDefaults(user))}
              makePrimary={primary !== null}
              legend="Nova carteira principal"
              onSaved={onSavedNew}
              onCancel={primary ? () => setAdding(null) : undefined}
            />
          </>
        ) : (
          <WalletForm
            key={primary.id}
            wallet={primary}
            defaultValues={walletToFormValues(primary)}
            legend="Carteira principal"
            onSaved={announce}
            actions={
              <button type="button" onClick={() => setToRemove(primary)} disabled={busy} className={cn(textButton, 'text-destructive')}>
                Remover carteira
              </button>
            }
          />
        )}
      </section>

      <section aria-labelledby={`${id}-secundaria`} className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="flex flex-col gap-[11px]">
            <h2 id={`${id}-secundaria`} className={sectionTitle}>
              Carteira secundária
            </h2>
            {secondaries.length === 0 && adding !== 'secondary' && (
              <p className="text-body leading-5 text-text-secondary">
                {primary ? 'Você ainda não adicionou uma carteira secundária.' : 'Salve a carteira principal para adicionar outras.'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className={cn('flex items-center gap-2', primary ? 'cursor-pointer' : 'cursor-not-allowed opacity-50')}>
              {/* Figma: círculo âmbar de 16px (semântica de checkbox, como "Usar outra carteira?" no checkout) */}
              <Checkbox
                checked={sameAsPrimary}
                disabled={!primary}
                onChange={(event) => setSameAsPrimary(event.target.checked)}
                aria-describedby={`${id}-igual-dica`}
              />
              <span className="text-body leading-5 text-foreground">Igual à carteira principal</span>
            </label>
            <span id={`${id}-igual-dica`} className="sr-only">
              Preenche a nova carteira com os dados da principal, menos endereço, apelido e ENS.
            </span>
            <button
              type="button"
              onClick={() => setAdding('secondary')}
              disabled={!primary || atLimit || adding === 'secondary'}
              title={limitHint}
              className={linkButton}
            >
              Adicionar
              <span className="sr-only"> carteira secundária</span>
            </button>
          </div>
        </div>

        {adding === 'secondary' && primary && (
          <WalletForm
            key={sameAsPrimary ? 'nova-igual' : 'nova'}
            wallet={null}
            defaultValues={withEmptySelects(sameAsPrimary ? sameAsPrimaryDefaults(primary) : newWalletFormDefaults(user))}
            legend="Nova carteira secundária"
            onSaved={onSavedNew}
            onCancel={() => setAdding(null)}
          />
        )}

        {secondaries.length > 0 && (
          <ul aria-label="Carteiras secundárias" className="flex flex-col gap-4">
            {secondaries.map((wallet) => (
              <SecondaryWalletCard
                key={wallet.id}
                wallet={wallet}
                editing={editingId === wallet.id}
                onEdit={() => setEditingId(wallet.id)}
                onCancelEdit={() => setEditingId(null)}
                onSaved={(message) => {
                  setEditingId(null)
                  announce(message)
                }}
                onMakePrimary={() => makePrimary(wallet)}
                onRemove={() => setToRemove(wallet)}
                busy={busy}
              />
            ))}
          </ul>
        )}
      </section>

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
