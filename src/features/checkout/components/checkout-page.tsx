import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronDownIcon } from 'lucide-react'
import { useId, useRef, useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import arrowBack from '@/assets/icons/arrow-back.svg'
import { Skeleton } from '@/components/feedback/skeleton'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { Container } from '@/components/layout/container'
import { buttonVariants } from '@/components/ui/button-variants'
import { cartQueries } from '@/entities/cart'
import { CATALOG_SECTION_ID } from '@/entities/catalog'
import { useCurrentUser, type User } from '@/entities/session'
import { sameWalletAddress, stripEthSuffix, walletQueries, type Wallet, type WalletProvider } from '@/entities/wallet'
import { cn } from '@/lib/utils'
import { useCheckoutFlow, type CheckoutFlow } from '../hooks/use-checkout-flow'
import { collectorDefaults, collectorSchema, type CollectorFormValues, type CollectorInput } from '../schemas/checkout'
import { CollectorFields, type CollectorForm } from './collector-form'
import { OrderItems, OrderReviewSkeleton, OrderTotals } from './order-review'
import { OrderStatusDialog } from './order-status-dialog'
import { describeChange } from './quote-change-text'
import { QuoteChangesDialog } from './quote-changes-dialog'
import { ProviderOptions, SavedWallets, type WalletMenuActions } from './wallet-options'

/** Voltar (topo mobile): histórico quando possível; senão, o carrinho. */
function BackButton() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => (canGoBack ? router.history.back() : void router.navigate({ to: '/carrinho' }))}
      className="flex size-[35px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-raised"
    >
      <img src={arrowBack} alt="" width={13} height={7} className="rotate-90" />
    </button>
  )
}

function Heading() {
  return (
    <>
      <nav aria-label="Trilha de navegação" className="hidden pt-8 md:block">
        <ol className="flex gap-1 text-body-md leading-4 font-bold text-foreground">
          <li>
            <Link to="/" className="rounded-sm hover:text-text-accent">
              Início
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to="/" hash={CATALOG_SECTION_ID} className="rounded-sm hover:text-text-accent">
              Mercado
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>
      {/* Mobile (Figma "Pagamento com carteira"): voltar + título */}
      <div className="flex items-center gap-6 md:hidden">
        <BackButton />
        <h1 className="text-title-sm leading-6 font-bold text-foreground">Pagamento com carteira</h1>
      </div>
      <h1 className="sr-only max-md:hidden">Pagamento</h1>
    </>
  )
}

/** Valores do formulário a partir da carteira salva (o sufixo ".eth" é fixo no campo do ENS). */
function walletFields(wallet: Wallet) {
  return {
    network: wallet.network,
    walletAddress: wallet.address,
    walletProvider: wallet.provider,
    ensName: stripEthSuffix(wallet.ensName),
  }
}

function initialValues(user: User, wallet: Wallet | null): CollectorFormValues {
  const values = collectorDefaults(user, wallet)
  return {
    ...values,
    ensName: stripEthSuffix(values.ensName),
    // Select nativo controlado por RHF: sem valor, '' mantém o placeholder visível (senão o navegador
    // mostra a primeira opção, que não está no formulário); o schema acusa o campo vazio.
    network: values.network ?? ('' as CollectorFormValues['network']),
    walletProvider: values.walletProvider ?? ('' as CollectorFormValues['walletProvider']),
  }
}

type CheckoutFormProps = {
  user: User
  wallets: Wallet[]
  flow: CheckoutFlow
  walletActions?: WalletMenuActions
}

/**
 * Formulário único das duas versões do Figma (D-08): no desktop, "Perfil do colecionador" + resumo
 * à direita; no mobile, carteiras salvas + provedores, com os dados do colecionador recolhidos
 * (vêm do perfil) e abertos em "Trocar carteira" ou quando algo precisa ser corrigido.
 */
function CheckoutForm({ user, wallets, flow, walletActions }: CheckoutFormProps) {
  const primary = wallets.find((w) => w.role === 'primary') ?? wallets[0] ?? null
  const [selectedWalletId, setSelected] = useState<string | null>(primary?.id ?? null)
  // Seleção atual para callbacks assíncronos (a remoção resolve depois de outros renders)
  const selectedRef = useRef(selectedWalletId)
  function setSelectedWalletId(id: string | null) {
    selectedRef.current = id
    setSelected(id)
  }
  const [detailsOpen, setDetailsOpen] = useState(primary === null)
  const detailsId = useId()
  const form: CollectorForm = useForm<CollectorFormValues, unknown, CollectorInput>({
    resolver: zodResolver(collectorSchema),
    defaultValues: initialValues(user, primary),
    mode: 'onTouched',
  })
  const { setValue, handleSubmit, setFocus } = form
  const provider = useWatch({ control: form.control, name: 'walletProvider' }) as WalletProvider | undefined
  const busy = flow.isSubmitting

  function selectWallet(wallet: Wallet) {
    setSelectedWalletId(wallet.id)
    for (const [key, value] of Object.entries(walletFields(wallet))) {
      setValue(key as keyof ReturnType<typeof walletFields>, value, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })
    }
  }

  function toggleOtherWallet(other: boolean) {
    if (!other) {
      if (primary) selectWallet(wallets.find((w) => w.id === selectedWalletId) ?? primary)
      return
    }
    setSelectedWalletId(null)
    setValue('walletAddress', '', { shouldDirty: true })
    setValue('ensName', '', { shouldDirty: true })
  }

  /** "Trocar carteira" (mobile): carteira digitada no formulário, que abre já com o foco no endereço. */
  function switchWallet() {
    toggleOtherWallet(true)
    setDetailsOpen(true)
    requestAnimationFrame(() => setFocus('walletAddress'))
  }

  /** Carteira escolhida removida (menu ⋮): passa para outra salva ou para a carteira digitada. */
  function walletRemoved(wallet: Wallet) {
    if (wallet.id !== selectedRef.current) return
    const next = wallets.find((w) => w.id !== wallet.id)
    if (next) selectWallet(next)
    else toggleOtherWallet(true)
  }

  function setProvider(value: WalletProvider) {
    setValue('walletProvider', value, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })
  }

  const onSubmit = handleSubmit(
    (collector) => {
      const saved = wallets.find((w) => w.id === selectedWalletId)
      // A carteira salva só vale se o formulário ainda aponta para ela (senão é carteira digitada)
      const walletId =
        saved && saved.network === collector.network && sameWalletAddress(saved.address, collector.walletAddress, collector.network)
          ? saved.id
          : null
      flow.submit({ walletId, network: collector.network, collector })
    },
    (errors) => {
      // No mobile os campos ficam recolhidos: abre e leva o foco ao primeiro erro
      setDetailsOpen(true)
      const first = Object.keys(errors)[0] as keyof CollectorFormValues | undefined
      if (first && first !== 'walletProvider') requestAnimationFrame(() => setFocus(first))
    },
  )

  const quote = flow.quote
  const providerError = form.formState.errors.walletProvider?.message

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-busy={busy}
      className="flex flex-col gap-8 max-md:flex-1 xl:flex-row xl:items-start xl:justify-between"
    >
      {/* Coluna do colecionador */}
      <div className="flex min-w-0 flex-col gap-8 md:gap-[18px]">
        <div className="flex flex-col gap-8 md:hidden">
          <SavedWallets
            wallets={wallets}
            selectedId={selectedWalletId}
            onSelect={selectWallet}
            onSwitch={switchWallet}
            actions={walletActions}
            onRemoved={walletRemoved}
          />
          <ProviderOptions variant="mobile" value={provider} onChange={setProvider} error={providerError} />
        </div>

        <section aria-labelledby={`${detailsId}-titulo`} className="flex flex-col gap-[18px] md:gap-[11px]">
          <h2 id={`${detailsId}-titulo`} className="text-body-xl leading-5 font-bold text-foreground">
            {/* No mobile o título é o botão que abre/fecha os dados (D-08) */}
            <button
              type="button"
              aria-expanded={detailsOpen}
              aria-controls={detailsId}
              onClick={() => setDetailsOpen((open) => !open)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-sm text-left md:hidden"
            >
              Perfil do colecionador
              <ChevronDownIcon aria-hidden className={cn('size-5 text-text-accent transition-transform', detailsOpen && 'rotate-180')} />
            </button>
            <span className="max-md:hidden">Perfil do colecionador</span>
          </h2>
          <div id={detailsId} className={cn(!detailsOpen && 'max-md:hidden')}>
            <CollectorFields
              form={form}
              hasSavedWallet={wallets.length > 0}
              useOtherWallet={wallets.length > 0 && selectedWalletId === null}
              onUseOtherWalletChange={toggleOtherWallet}
              disabled={busy}
            />
          </div>
        </section>
      </div>

      {/* Resumo (desktop) + total e ação (mobile) */}
      {/* Mobile: `contents`, para a barra fixa ter o formulário inteiro como bloco de referência do `sticky` */}
      <div className="flex flex-col gap-5 max-md:contents md:gap-[18px] xl:w-[405px] xl:shrink-0">
        {flow.initialChanges.length > 0 && (
          <output className="block border-l-2 border-primary bg-card px-4 py-3 text-body leading-[22px] text-foreground">
            <p className="font-bold text-text-accent">Atualizamos o seu pedido:</p>
            <ul className="mt-1 flex flex-col gap-1">
              {flow.initialChanges.map((change, index) => (
                <li key={index}>{describeChange(change)}</li>
              ))}
            </ul>
          </output>
        )}
        {quote ? (
          <>
            <div className="hidden flex-col gap-3 md:flex">
              <OrderItems items={quote.items} />
              <OrderTotals totals={quote.totals} couponCode={quote.coupon?.eligible ? quote.coupon.code : null} />
            </div>
          </>
        ) : (
          <OrderReviewSkeleton className="max-md:hidden" />
        )}
        <div className="hidden md:block">
          <ProviderOptions variant="desktop" value={provider} onChange={setProvider} error={providerError} />
        </div>

        <p aria-live="assertive" role="alert" className={cn('text-center text-body leading-5 text-destructive', !flow.error && 'sr-only')}>
          {flow.error}
        </p>
        {/* Mobile: o total vai na barra fixa, logo acima do botão (m-04), para nunca ficar coberto por ela */}
        <div className="sticky bottom-0 z-30 -mx-6 bg-background px-6 pt-3 pb-8 max-md:mt-auto md:static md:mx-0 md:p-0">
          {quote && (
            <div className="mb-5 md:hidden">
              <OrderTotals totals={quote.totals} compact />
            </div>
          )}
          <button
            type="submit"
            disabled={busy || !quote}
            className={cn(
              'flex w-full cursor-pointer items-center justify-center font-bold text-primary-foreground disabled:cursor-wait disabled:opacity-60',
              'h-[60px] rounded-[40px] bg-[image:var(--gradient-checkout)] text-body-md',
              'md:mt-2 md:h-[45px] md:rounded-md md:bg-primary md:bg-none',
            )}
          >
            {busy ? 'Processando…' : 'Confirmar compra'}
          </button>
        </div>
      </div>
    </form>
  )
}

function CheckoutSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-8 xl:flex-row xl:justify-between">
      <div className="flex flex-col gap-[18px] xl:w-[764px]">
        <Skeleton className="h-5 w-56" />
        <div className="grid gap-x-6 gap-y-[18px] md:grid-cols-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex flex-col gap-[7px]">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full rounded-sm" />
            </div>
          ))}
        </div>
      </div>
      <OrderReviewSkeleton className="xl:w-[405px]" />
    </div>
  )
}

/**
 * Tela "Pagamento" (Figma desktop Checkout Page `70522:3321`, mobile `16:748` / Content `70398:239`).
 * Fluxo (T-071 a T-074): cotação ao abrir → formulário → nova cotação ao confirmar (diff e nova
 * confirmação se algo mudou) → pedido com `Idempotency-Key` → status do servidor.
 */
export function CheckoutPage({ walletActions }: { walletActions?: WalletMenuActions } = {}) {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const cart = useQuery(cartQueries.get())
  const wallets = useQuery({ ...walletQueries.list(), enabled: user !== null })
  const flow = useCheckoutFlow(cart.data)

  let content: ReactNode
  if (cart.isError || wallets.isError) {
    content = (
      <ErrorState
        title="Não foi possível carregar o pagamento"
        description="Verifique sua conexão e tente novamente."
        action={{
          label: 'Tentar novamente',
          onClick: () => {
            if (cart.isError) void cart.refetch()
            if (wallets.isError) void wallets.refetch()
          },
        }}
      />
    )
  } else if (flow.quoteError) {
    content = (
      <ErrorState
        title={flow.quoteError.title}
        description={flow.quoteError.description}
        action={
          flow.quoteError.retry ? (
            { label: 'Tentar novamente', onClick: flow.retryQuote }
          ) : (
            <Link to="/carrinho" className={buttonVariants({ size: 'lg' })}>
              Voltar ao carrinho
            </Link>
          )
        }
      />
    )
  } else if (cart.data && cart.data.items.length === 0 && !flow.order) {
    content = (
      <EmptyState
        title="Seu carrinho está vazio"
        description="Adicione NFTs ao carrinho para finalizar uma compra."
        action={
          <Link to="/" hash={CATALOG_SECTION_ID} className={buttonVariants({ size: 'lg' })}>
            Explorar o mercado
          </Link>
        }
      />
    )
  } else if (user && wallets.data) {
    content = <CheckoutForm user={user} wallets={wallets.data} flow={flow} walletActions={walletActions} />
  } else {
    content = <CheckoutSkeleton />
  }

  return (
    <Container className="flex flex-col gap-8 pt-[30px] max-md:min-h-dvh md:gap-[38px] md:pt-0">
      <Heading />
      {content}
      <QuoteChangesDialog
        quote={flow.changedQuote}
        confirming={flow.isSubmitting}
        onConfirm={flow.confirmChanges}
        onCancel={flow.dismissChanges}
      />
      <OrderStatusDialog
        order={flow.order}
        onCloseRejected={flow.dismissOrder}
        onCloseConfirmed={() => {
          flow.dismissOrder()
          void navigate({ to: '/' })
        }}
      />
    </Container>
  )
}
