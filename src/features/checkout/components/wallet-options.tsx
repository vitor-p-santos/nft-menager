import { EllipsisVerticalIcon } from 'lucide-react'
import { useId, useState } from 'react'
import walletCoinbase from '@/assets/icons/wallet-coinbase.png'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { RadioGroup, RadioGroupItem, RadioIndicator } from '@/components/ui/radio-group'
import { NETWORK_LABELS, type Network } from '@/entities/nft'
import { shortAddress, WALLET_PROVIDER_LABELS, type Wallet, type WalletProvider } from '@/entities/wallet'
import { cn } from '@/lib/utils'

/**
 * Ações do menu ⋮ dos cartões de carteira. Vêm da rota (`routes/checkout.tsx`, feature profile):
 * o checkout não importa outra feature. Sem elas o menu não aparece.
 */
export type WalletMenuActions = {
  setPrimary: (id: string) => Promise<unknown>
  remove: (id: string) => Promise<unknown>
  isPending: boolean
}

/** Rede no cartão mobile: "Rede principal Ethereum" (mainnet) e "Rede Polygon" (como no m-04). */
function networkLine(network: Network) {
  return network === 'ethereum' ? 'Rede principal Ethereum' : `Rede ${NETWORK_LABELS[network]}`
}

type SavedWalletsProps = {
  wallets: Wallet[]
  /** `null` = carteira digitada no formulário ("Trocar carteira"). */
  selectedId: string | null
  onSelect: (wallet: Wallet) => void
  onSwitch: () => void
  actions?: WalletMenuActions
  /** Antes de remover: o formulário troca a seleção se a carteira removida era a escolhida. */
  onBeforeRemove?: (wallet: Wallet) => void
}

/** Menu ⋮ do cartão (sem frame no Figma: segue o menu da conta): definir como principal e remover. */
function WalletMenu({
  wallet,
  actions,
  onRequestRemove,
  onFeedback,
}: {
  wallet: Wallet
  actions: WalletMenuActions
  onRequestRemove: () => void
  onFeedback: (message: string, error?: boolean) => void
}) {
  const isPrimary = wallet.role === 'primary'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Opções da carteira ${wallet.label}`}
        disabled={actions.isPending}
        className="absolute right-3 flex size-8 cursor-pointer items-center justify-center rounded-sm text-text-secondary disabled:cursor-wait disabled:opacity-60"
      >
        <EllipsisVerticalIcon aria-hidden className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="min-w-52 border-border bg-surface-card">
        <DropdownMenuItem
          disabled={isPrimary}
          onSelect={() =>
            void actions
              .setPrimary(wallet.id)
              .then(() => onFeedback(`${wallet.label} agora é a carteira principal.`))
              .catch(() => onFeedback('Não foi possível definir a carteira principal. Tente novamente.', true))
          }
          className="cursor-pointer text-body text-foreground"
        >
          {isPrimary ? 'Carteira principal' : 'Definir como principal'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onRequestRemove} className="cursor-pointer text-body text-destructive">
          Remover carteira
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * "Carteira conectada" (Figma Mobile / Pagamento, Content `70398:239`): cartões de 93px, raio 20px,
 * em Surface Card, com radio, apelido, ENS (ou endereço curto) e rede. "Trocar carteira" abre o
 * formulário do colecionador para informar outra carteira.
 */
export function SavedWallets({ wallets, selectedId, onSelect, onSwitch, actions, onBeforeRemove }: SavedWalletsProps) {
  const titleId = useId()
  const [toRemove, setToRemove] = useState<Wallet | null>(null)
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null)
  const announce = (message: string, error = false) => setFeedback({ message, error })

  function confirmRemove() {
    const wallet = toRemove
    if (!wallet || !actions) return
    setToRemove(null)
    onBeforeRemove?.(wallet)
    void actions
      .remove(wallet.id)
      .then(() => announce(`Carteira ${wallet.label} removida.`))
      .catch(() => announce('Não foi possível remover a carteira. Tente novamente.', true))
  }
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-body-lg leading-5 font-bold text-foreground">
          Carteira conectada
        </h2>
        <button
          type="button"
          onClick={onSwitch}
          className="cursor-pointer rounded-sm text-body leading-5 font-bold text-text-accent hover:underline"
        >
          Trocar carteira
        </button>
      </div>
      {wallets.length === 0 ? (
        <p className="text-body leading-5 text-text-secondary">
          Você ainda não tem carteiras salvas. Informe a carteira no perfil do colecionador abaixo.
        </p>
      ) : (
        <RadioGroup aria-labelledby={titleId} className="flex flex-col gap-5">
          {wallets.map((wallet) => {
            const checked = wallet.id === selectedId
            return (
              <div key={wallet.id} className="relative flex min-h-[93px] items-center rounded-2xl bg-card">
                <label className="flex flex-1 cursor-pointer items-center gap-[19px] py-3.5 pr-12 pl-[19px]">
                  <RadioGroupItem
                    name="checkout-saved-wallet"
                    value={wallet.id}
                    checked={checked}
                    onChange={() => onSelect(wallet)}
                  />
                  <span className="rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                    <RadioIndicator checked={checked} tone="soft" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-body-lg leading-6 font-bold text-foreground">{wallet.label}</span>
                    <span className="truncate text-body leading-[22px] text-text-secondary">
                      {wallet.ensName ?? shortAddress(wallet.address)}
                    </span>
                    <span className="text-body leading-[22px] text-text-secondary">{networkLine(wallet.network)}</span>
                  </span>
                </label>
                {actions && (
                  <WalletMenu wallet={wallet} actions={actions} onRequestRemove={() => setToRemove(wallet)} onFeedback={announce} />
                )}
              </div>
            )
          })}
        </RadioGroup>
      )}
      <output aria-live="polite" className={cn('text-body leading-5 empty:hidden', feedback?.error ? 'text-destructive' : 'text-text-secondary')}>
        {feedback?.message}
      </output>
      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(open) => !open && setToRemove(null)}
        title="Remover carteira?"
        description={`${toRemove?.label ?? 'A carteira'} deixa de aparecer no pagamento e no perfil.${toRemove?.role === 'primary' && wallets.length > 1 ? ' A carteira secundária mais antiga passa a ser a principal.' : ''}`}
        confirmLabel="Remover carteira"
        onConfirm={confirmRemove}
      />
    </section>
  )
}

/** Ícone redondo de 40px do provedor (mobile): letra âmbar ou o ícone de carteira do Figma. */
function ProviderIcon({ provider }: { provider: WalletProvider }) {
  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-body leading-4 font-bold text-text-accent"
    >
      {provider === 'coinbase' ? <img src={walletCoinbase} alt="" width={23} height={23} /> : provider === 'metamask' ? 'M' : 'W'}
    </span>
  )
}

/** Ordem dos provedores no Figma (desktop e mobile). */
const PROVIDER_ORDER: readonly WalletProvider[] = ['walletconnect', 'metamask', 'coinbase']

type ProviderOptionsProps = {
  variant: 'desktop' | 'mobile'
  value: WalletProvider | undefined
  onChange: (provider: WalletProvider) => void
  error?: string
}

/**
 * "Carteira e rede": escolha do provedor (o mesmo campo "Tipo de carteira" do formulário).
 * - desktop (Checkout Page): opções de 45px com borda Color/Border e Color/Primary quando marcada; a
 *   WalletConnect aparece como o selo "METAMASK • WALLETCONNECT • COINBASE" do Figma;
 * - mobile (m-04): linhas de 64px em Surface Card, ícone redondo à esquerda e radio à direita.
 */
export function ProviderOptions({ variant, value, onChange, error }: ProviderOptionsProps) {
  const titleId = useId()
  const errorId = useId()
  const name = `checkout-provider-${variant}`

  return (
    <section aria-labelledby={titleId} className={cn('flex flex-col', variant === 'desktop' ? 'gap-[18px]' : 'gap-5')}>
      <h2
        id={titleId}
        className={cn(
          'leading-5 font-bold text-foreground',
          variant === 'desktop' ? 'text-center text-body-xl' : 'text-body-lg',
        )}
      >
        Carteira e rede
      </h2>
      <RadioGroup
        aria-labelledby={titleId}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        className={cn('flex flex-col', variant === 'desktop' ? 'gap-4' : 'gap-[17px]')}
      >
        {PROVIDER_ORDER.map((provider) => {
          const checked = value === provider
          const input = (
            <RadioGroupItem name={name} value={provider} checked={checked} onChange={() => onChange(provider)} />
          )
          if (variant === 'mobile') {
            return (
              <label key={provider} className="flex h-16 cursor-pointer items-center gap-3 rounded-2xl bg-card pr-[22px] pl-3.5">
                {input}
                <ProviderIcon provider={provider} />
                <span className="flex-1 text-body leading-5 text-foreground">{WALLET_PROVIDER_LABELS[provider]}</span>
                <span className="rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                  <RadioIndicator checked={checked} tone="soft" />
                </span>
              </label>
            )
          }
          return (
            <label
              key={provider}
              className={cn(
                'flex h-[45px] cursor-pointer items-center gap-[11px] border px-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
                checked ? 'border-primary' : 'border-border',
              )}
            >
              {input}
              <RadioIndicator checked={checked} tone="primary" />
              {provider === 'walletconnect' ? (
                <Badge variant="seal">
                  <span className="sr-only">WalletConnect: </span>
                  <span aria-hidden>{'METAMASK  •  WALLETCONNECT  •  COINBASE'}</span>
                  <span className="sr-only">MetaMask, WalletConnect ou Coinbase</span>
                </Badge>
              ) : (
                <span className="text-body-md leading-5 text-foreground">
                  {WALLET_PROVIDER_LABELS[provider]}
                </span>
              )}
            </label>
          )
        })}
      </RadioGroup>
      {error && (
        <p id={errorId} className="text-caption leading-4 text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
