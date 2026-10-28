import { useId, useState } from 'react'
import { buttonVariants } from '@/components/ui/button-variants'
import { Checkbox } from '@/components/ui/checkbox'
import { NETWORK_LABELS } from '@/entities/nft'
import type { User } from '@/entities/session'
import { shortAddress, WALLET_PROVIDER_LABELS, type Wallet } from '@/entities/wallet'
import { cn } from '@/lib/utils'
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
// Desabilitado mantém o ponteiro: o `title` com o limite de carteiras aparece no hover
const linkButton = cn(
  buttonVariants({ variant: 'link', size: 'none' }),
  'rounded-sm text-body-lg leading-5 font-bold disabled:pointer-events-auto disabled:cursor-not-allowed disabled:no-underline',
)
const textButton = 'cursor-pointer rounded-sm text-body leading-4 text-foreground hover:text-text-accent disabled:cursor-not-allowed disabled:opacity-50'

export type Adding = null | 'primary' | 'secondary'

const limitHint = (atLimit: boolean) => (atLimit ? `Limite de ${MAX_WALLETS} carteiras atingido` : undefined)

type PrimaryWalletSectionProps = {
  user: User
  primary: Wallet | null
  adding: Adding
  atLimit: boolean
  busy: boolean
  onAdd: () => void
  onCancelAdd: () => void
  onSavedNew: (message: string) => void
  onSaved: (message: string) => void
  onRemove: (wallet: Wallet) => void
}

/** "Carteira principal": o formulário da principal (ou o de uma nova, que passa a ser a principal). */
export function PrimaryWalletSection({ user, primary, adding, atLimit, busy, onAdd, onCancelAdd, onSavedNew, onSaved, onRemove }: PrimaryWalletSectionProps) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-[30px]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id={id} className={sectionTitle}>
            Carteira principal
          </h2>
          <p className="text-caption-lg leading-4 text-text-accent">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
        </div>
        {primary && adding !== 'primary' && (
          <button type="button" onClick={onAdd} disabled={atLimit} title={limitHint(atLimit)} className={linkButton}>
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
            onCancel={primary ? onCancelAdd : undefined}
          />
        </>
      ) : (
        <WalletForm
          key={primary.id}
          wallet={primary}
          defaultValues={walletToFormValues(primary)}
          legend="Carteira principal"
          onSaved={onSaved}
          actions={
            <button type="button" onClick={() => onRemove(primary)} disabled={busy} className={cn(textButton, 'text-destructive')}>
              Remover carteira
            </button>
          }
        />
      )}
    </section>
  )
}

type SecondaryWalletCardProps = {
  wallet: Wallet
  editing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSaved: (message: string) => void
  onMakePrimary: () => void
  onRemove: () => void
  busy: boolean
}

function SecondaryWalletCard({ wallet, editing, onEdit, onCancelEdit, onSaved, onMakePrimary, onRemove, busy }: SecondaryWalletCardProps) {
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

type SecondaryWalletsSectionProps = {
  user: User
  primary: Wallet | null
  secondaries: Wallet[]
  adding: Adding
  atLimit: boolean
  busy: boolean
  editingId: string | null
  onAdd: () => void
  onCancelAdd: () => void
  onSavedNew: (message: string) => void
  onEdit: (id: string | null) => void
  onSaved: (message: string) => void
  onMakePrimary: (wallet: Wallet) => void
  onRemove: (wallet: Wallet) => void
}

/** "Carteira secundária": adicionar (opcionalmente "Igual à carteira principal") e a lista editável. */
export function SecondaryWalletsSection({
  user,
  primary,
  secondaries,
  adding,
  atLimit,
  busy,
  editingId,
  onAdd,
  onCancelAdd,
  onSavedNew,
  onEdit,
  onSaved,
  onMakePrimary,
  onRemove,
}: SecondaryWalletsSectionProps) {
  const id = useId()
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-[11px]">
          <h2 id={id} className={sectionTitle}>
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
            onClick={onAdd}
            disabled={!primary || atLimit || adding === 'secondary'}
            title={limitHint(atLimit)}
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
          onCancel={onCancelAdd}
        />
      )}

      {secondaries.length > 0 && (
        <ul aria-label="Carteiras secundárias" className="flex flex-col gap-4">
          {secondaries.map((wallet) => (
            <SecondaryWalletCard
              key={wallet.id}
              wallet={wallet}
              editing={editingId === wallet.id}
              onEdit={() => onEdit(wallet.id)}
              onCancelEdit={() => onEdit(null)}
              onSaved={(message) => {
                onEdit(null)
                onSaved(message)
              }}
              onMakePrimary={() => onMakePrimary(wallet)}
              onRemove={() => onRemove(wallet)}
              busy={busy}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
