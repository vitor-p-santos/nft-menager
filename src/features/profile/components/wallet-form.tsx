import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { buttonVariants } from '@/components/ui/button-variants'
import { InputField, SelectField } from '@/components/ui/form-field'
import { NETWORK_LABELS, networkSchema } from '@/entities/nft'
import { WALLET_PROVIDER_LABELS, WALLET_PROVIDERS, type Wallet } from '@/entities/wallet'
import { cn } from '@/lib/utils'
import { getProfileFormErrors, useCreateWallet, useUpdateWallet } from '../api'
import { walletInputSchema, walletToFormValues, type WalletFormValues, type WalletInput } from '../schemas'

const NETWORK_OPTIONS = networkSchema.options.map((value) => ({ value, label: NETWORK_LABELS[value] }))
const PROVIDER_OPTIONS = WALLET_PROVIDERS.map((value) => ({ value, label: WALLET_PROVIDER_LABELS[value] }))

const WALLET_FIELDS = [
  'nickname',
  'displayName',
  'profileName',
  'network',
  'provider',
  'address',
  'secondaryWallet',
  'referralCode',
  'email',
  'ensName',
] as const

type WalletFormProps = {
  /** `null` = carteira nova (`POST /me/wallets`); senão edita a carteira (`PATCH`). */
  wallet: Wallet | null
  defaultValues: WalletFormValues
  /** Carteira nova que passa a ser a principal ("Adicionar" de "Carteira principal"). */
  makePrimary?: boolean
  /** Rótulo acessível do grupo de campos (ex.: "Carteira principal"). */
  legend: string
  onSaved: (message: string) => void
  onCancel?: () => void
  /** Ações extras ao lado de "Salvar carteira" (ex.: remover). */
  actions?: ReactNode
}

/**
 * Formulário de carteira (Figma Desktop/Carteiras `9:1670`, recorte d-09): grade de 2 colunas de
 * 417px (gap de 28px) com os mesmos campos do "Perfil do colecionador" do checkout, validados pelo
 * `walletInputSchema` (o mesmo do handler). Erros da API voltam para os campos (409 `wallet_exists`
 * no endereço) ou para o aviso geral.
 */
export function WalletForm({ wallet, defaultValues, makePrimary = false, legend, onSaved, onCancel, actions }: WalletFormProps) {
  const form = useForm<WalletFormValues, unknown, WalletInput>({
    resolver: zodResolver(walletInputSchema),
    defaultValues,
    mode: 'onTouched',
  })
  const create = useCreateWallet()
  const update = useUpdateWallet()
  const [formError, setFormError] = useState<string | null>(null)
  const busy = create.isPending || update.isPending
  const errors = form.formState.errors
  const { register } = form

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      if (wallet) {
        const saved = await update.mutateAsync({ id: wallet.id, values })
        form.reset(walletToFormValues(saved))
        onSaved(`Carteira ${saved.nickname} salva.`)
      } else {
        const saved = await create.mutateAsync({ ...values, makePrimary })
        onSaved(`Carteira ${saved.nickname} adicionada${saved.role === 'primary' ? ' como principal' : ''}.`)
      }
    } catch (error) {
      const { fields, form: general } = getProfileFormErrors(error, WALLET_FIELDS)
      for (const [field, message] of Object.entries(fields)) {
        form.setError(field as (typeof WALLET_FIELDS)[number], { message }, { shouldFocus: true })
      }
      setFormError(general)
    }
  })

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} aria-busy={busy} className="flex flex-col">
      <fieldset disabled={busy} className="grid min-w-0 grid-cols-1 gap-x-7 gap-y-6 md:grid-cols-2">
        <legend className="sr-only">{legend}</legend>
        <InputField label="Nome de exibição" required autoComplete="name" error={errors.displayName?.message} {...register('displayName')} />
        <InputField label="Apelido da carteira" required autoComplete="off" error={errors.nickname?.message} {...register('nickname')} />
        <SelectField
          label="Rede"
          required
          placeholder="Selecione uma rede"
          options={NETWORK_OPTIONS}
          error={errors.network?.message}
          {...register('network')}
        />
        <InputField label="Nome do perfil" required error={errors.profileName?.message} {...register('profileName')} />
        <InputField
          label="Endereço da carteira"
          required
          placeholder="Endereço 0x da carteira"
          autoComplete="off"
          spellCheck={false}
          error={errors.address?.message}
          {...register('address')}
        />
        {/* Sem rótulo visível no Figma: alinhado ao campo do endereço (altura do rótulo = 23px) */}
        <InputField
          label="ENS ou carteira secundária (opcional)"
          hideLabel
          placeholder="ENS ou carteira secundária (opcional)"
          autoComplete="off"
          spellCheck={false}
          className="md:pt-[23px]"
          error={errors.secondaryWallet?.message}
          {...register('secondaryWallet')}
        />
        <SelectField
          label="Tipo de carteira"
          required
          placeholder="Selecione uma carteira"
          options={PROVIDER_OPTIONS}
          error={errors.provider?.message}
          {...register('provider')}
        />
        <InputField label="Código de indicação" autoComplete="off" error={errors.referralCode?.message} {...register('referralCode')} />
        <InputField label="E-mail" required type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <InputField label="Nome ENS" suffix=".eth" autoComplete="off" spellCheck={false} error={errors.ensName?.message} {...register('ensName')} />
      </fieldset>

      {formError && (
        <p role="alert" className="mt-5 text-body leading-5 text-destructive">
          {formError}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <button
          type="submit"
          disabled={busy}
          className={cn(buttonVariants({ size: 'none' }), 'h-10 min-w-[131px] rounded-sm px-3 text-body leading-4 font-bold disabled:cursor-wait')}
        >
          {busy ? 'Salvando...' : 'Salvar carteira'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="cursor-pointer rounded-sm text-body leading-4 text-foreground hover:text-text-accent">
            Cancelar
          </button>
        )}
        {actions}
      </div>
    </form>
  )
}
