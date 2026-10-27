import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { Skeleton } from '@/components/feedback/skeleton'
import { buttonVariants } from '@/components/ui/button-variants'
import { CATALOG_SECTION_ID } from '@/entities/catalog'
import { ApiError } from '@/lib/api'
import { formatEthLabel } from '@/lib/money'
import { cn } from '@/lib/utils'
import { useApplyCoupon, useRemoveCoupon } from '../api/queries'
import { couponInputSchema, type Cart, type CouponInput } from '../schemas/cart'

/**
 * Cupom (Figma "Código promocional"): RHF + Zod. Erros 422 do servidor (`coupon_invalid`,
 * `coupon_expired`) voltam para o campo; o cupom aplicado aparece abaixo, com "Remover".
 */
function CouponForm({ cart }: { cart: Cart }) {
  const inputId = useId()
  const errorId = useId()
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CouponInput>({ resolver: zodResolver(couponInputSchema), defaultValues: { code: '' } })

  const onSubmit = handleSubmit((values) =>
    apply.mutate(values, {
      onSuccess: () => reset(),
      onError: (error) =>
        setError('code', {
          message:
            error instanceof ApiError && error.kind === 'validation'
              ? error.message
              : 'Não foi possível aplicar o cupom. Tente novamente.',
        }),
    }),
  )

  const coupon = cart.coupon
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <label htmlFor={inputId} className="sr-only text-body leading-4 font-bold text-foreground md:not-sr-only">
        Código promocional
      </label>
      <div
        className={cn(
          'flex items-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
          // Mobile: pílula de 58px com o botão em gradiente; desktop: campo de 40px com borda âmbar
          'h-[58px] rounded-full border border-border pl-6 shadow-promo md:h-10 md:rounded-md md:border-primary md:pl-2 md:shadow-none',
        )}
      >
        <input
          id={inputId}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="Digite o código promocional..."
          aria-invalid={!!errors.code}
          aria-describedby={errors.code ? errorId : undefined}
          className="min-w-0 flex-1 bg-transparent text-body leading-4 text-foreground placeholder:text-secondary focus-visible:outline-none md:text-caption"
          {...register('code')}
        />
        <button
          type="submit"
          disabled={apply.isPending}
          className={cn(
            'flex shrink-0 cursor-pointer items-center justify-center font-bold text-primary-foreground disabled:cursor-wait disabled:opacity-60',
            'h-full w-[97px] rounded-full bg-[image:var(--gradient-apply)] text-body-lg leading-4 text-foreground',
            'md:w-[102px] md:rounded-none md:rounded-r-[5px] md:bg-primary md:bg-none md:text-body-md md:text-primary-foreground',
          )}
        >
          Aplicar
        </button>
      </div>
      {errors.code && (
        <p id={errorId} role="alert" className="text-caption leading-4 text-destructive">
          {errors.code.message}
        </p>
      )}
      {coupon && (
        <p className="flex flex-wrap items-center gap-x-2 text-caption leading-4 text-text-accent">
          <span>
            Cupom <strong>{coupon.code}</strong> aplicado
            {!coupon.eligible && (
              <span className="text-muted-foreground">
                {' '}
                (sem efeito: subtotal mínimo de {formatEthLabel(coupon.minSubtotalWei ?? '0')})
              </span>
            )}
          </span>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
            className="cursor-pointer rounded-sm text-foreground underline underline-offset-4 disabled:cursor-wait disabled:opacity-60"
          >
            Remover<span className="sr-only"> cupom {coupon.code}</span>
          </button>
        </p>
      )}
      {remove.isError && (
        <p role="alert" className="text-caption leading-4 text-destructive">
          Não foi possível remover o cupom. Tente novamente.
        </p>
      )}
    </form>
  )
}

/** "Conectar e finalizar": pílula em gradiente de 60px no mobile, botão âmbar de 40px no desktop. */
const checkoutClass = cn(
  'flex w-full items-center justify-center font-bold text-primary-foreground',
  'h-[60px] rounded-[40px] bg-[image:var(--gradient-checkout)] text-body-lg',
  'md:h-10 md:rounded-md md:bg-primary md:bg-none md:text-body-md',
)

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-2', className)}>
      <dt className="whitespace-nowrap">{label}</dt>
      <dd className="text-right whitespace-nowrap">{value}</dd>
    </div>
  )
}

/**
 * Resumo (Figma desktop "Resumo da carteira", mobile "Payment Summary"): totais calculados pelo
 * servidor (wei), cupom e ações. No mobile vira uma folha presa ao rodapé da tela.
 */
export function CartSummary({ cart }: { cart: Cart }) {
  const { totals } = cart
  const hasUnavailable = cart.items.some((i) => i.issue === 'unavailable')

  return (
    <section
      aria-labelledby="resumo-titulo"
      className={cn(
        'sticky bottom-0 z-30 -mx-6 mt-auto -mb-6 flex flex-col gap-4 rounded-t-[40px] bg-card px-6 pt-6 pb-14 shadow-buy-bar',
        'md:static md:mx-0 md:my-0 md:rounded-none md:bg-transparent md:p-0 md:shadow-none xl:w-[332px] xl:shrink-0',
      )}
    >
      <h2
        id="resumo-titulo"
        className="sr-only text-lead leading-6 font-bold text-foreground md:not-sr-only md:border-b-[0.3px] md:border-secondary/40 md:pb-3"
      >
        Resumo da carteira
      </h2>
      <CouponForm cart={cart} />

      <dl className="flex flex-col gap-3 text-body-lg leading-5 text-foreground md:text-body-md">
        <Row label="Subtotal" value={formatEthLabel(totals.subtotalWei)} className="[&_dd]:md:text-lead" />
        <Row
          label={cart.coupon?.eligible ? `Desconto (${cart.coupon.code})` : 'Desconto do lançamento'}
          value={`(-) ${formatEthLabel(totals.discountWei)}`}
        />
        <div className="flex items-baseline justify-between gap-2">
          <dt className="whitespace-nowrap">Taxa de rede</dt>
          <dd className="flex flex-col items-end gap-1 text-right whitespace-nowrap">
            <span className="md:text-lead">{formatEthLabel(totals.networkFeeWei)}</span>
            <span className="text-caption leading-4 text-text-accent">Taxa estimada</span>
          </dd>
        </div>
        <Row
          label="Total"
          value={formatEthLabel(totals.totalWei)}
          className="pt-2 font-bold [&_dd]:text-lead [&_dd]:text-text-accent"
        />
      </dl>

      <div className="flex flex-col items-center gap-3">
        {/* Checkout é rota privada: sem sessão, `requireAuth` leva ao login e volta para cá depois */}
        {hasUnavailable ? (
          <button
            type="button"
            aria-disabled
            aria-describedby="resumo-aviso"
            className={cn(checkoutClass, 'cursor-not-allowed opacity-50')}
          >
            Conectar e finalizar
          </button>
        ) : (
          <Link to="/checkout" className={checkoutClass}>
            Conectar e finalizar
          </Link>
        )}
        {hasUnavailable && (
          <p id="resumo-aviso" className="text-center text-caption leading-4 text-destructive">
            Remova os itens indisponíveis para finalizar.
          </p>
        )}
        <Link
          to="/"
          hash={CATALOG_SECTION_ID}
          className={cn(buttonVariants({ variant: 'link', size: 'none' }), 'hidden rounded-sm text-body-md md:inline-flex')}
        >
          Continuar explorando
        </Link>
      </div>
    </section>
  )
}

export function CartSummarySkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4 xl:w-[332px] xl:shrink-0">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
      <Skeleton className="h-10 w-full" />
    </div>
  )
}
