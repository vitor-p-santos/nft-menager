import type { UseFormReturn } from 'react-hook-form'
import { NETWORK_LABELS, networkSchema } from '@/entities/nft'
import { WALLET_PROVIDER_LABELS, WALLET_PROVIDERS } from '@/entities/wallet'
import { cn } from '@/lib/utils'
import type { CollectorFormValues, CollectorInput } from '../schemas/checkout'
import { InputField, SelectField, TextareaField } from '@/components/ui/form-field'

const NETWORK_OPTIONS = networkSchema.options.map((value) => ({ value, label: NETWORK_LABELS[value] }))
const PROVIDER_OPTIONS = WALLET_PROVIDERS.map((value) => ({ value, label: WALLET_PROVIDER_LABELS[value] }))

export type CollectorForm = UseFormReturn<CollectorFormValues, unknown, CollectorInput>

type CollectorFieldsProps = {
  form: CollectorForm
  /** "Usar outra carteira?": carteira digitada em vez da carteira salva selecionada. */
  useOtherWallet: boolean
  onUseOtherWalletChange: (value: boolean) => void
  /** Sem carteiras salvas o toggle não faz sentido: a carteira é sempre digitada. */
  hasSavedWallet: boolean
  disabled?: boolean
}

/**
 * "Perfil do colecionador" (Figma Checkout Page `70522:3321`, coluna esquerda de 782px): grade de
 * 2 colunas de 370px (gap 24/18px), pré-preenchida com o perfil e a carteira escolhida (D-08).
 * Campos ligados ao `collectorSchema` (o mesmo schema que o handler MSW valida).
 */
export function CollectorFields({ form, useOtherWallet, onUseOtherWalletChange, hasSavedWallet, disabled }: CollectorFieldsProps) {
  const {
    register,
    formState: { errors },
  } = form

  return (
    <fieldset disabled={disabled} className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-[18px] md:grid-cols-2 xl:w-[764px]">
      <legend className="sr-only">Perfil do colecionador</legend>
      <InputField label="Nome de exibição" required autoComplete="name" error={errors.displayName?.message} {...register('displayName')} />
      <InputField label="Nome de usuário" required autoComplete="username" error={errors.username?.message} {...register('username')} />
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
        inputClassName="pl-[22px]"
        error={errors.walletAddress?.message}
        {...register('walletAddress')}
      />
      {/* Sem rótulo visível no Figma: alinhado ao campo do endereço (altura do rótulo = 23px) */}
      <InputField
        label="ENS ou carteira secundária (opcional)"
        hideLabel
        placeholder="ENS ou carteira secundária (opcional)"
        autoComplete="off"
        spellCheck={false}
        className="md:pt-[23px]"
        inputClassName="pl-[22px]"
        error={errors.secondaryWallet?.message}
        {...register('secondaryWallet')}
      />
      <SelectField
        label="Tipo de carteira"
        required
        placeholder="Selecione uma carteira"
        options={PROVIDER_OPTIONS}
        error={errors.walletProvider?.message}
        {...register('walletProvider')}
      />
      <InputField label="Código de indicação" autoComplete="off" error={errors.referralCode?.message} {...register('referralCode')} />
      <InputField label="E-mail" required type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <InputField
        label="Nome ENS"
        suffix=".eth"
        autoComplete="off"
        spellCheck={false}
        error={errors.ensName?.message}
        {...register('ensName')}
      />

      {hasSavedWallet && (
        <label className="flex w-fit cursor-pointer items-center gap-2 pt-3 md:col-span-2">
          <input
            type="checkbox"
            checked={useOtherWallet}
            onChange={(event) => onUseOtherWalletChange(event.target.checked)}
            className="peer sr-only"
          />
          {/* Figma: círculo âmbar de 16px (o toggle usa semântica de checkbox) */}
          <span
            aria-hidden
            className="flex size-4 items-center justify-center rounded-full border-[1.5px] border-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
          >
            <span className={cn('size-2 rounded-full bg-primary', !useOtherWallet && 'hidden')} />
          </span>
          <span className="text-body-md leading-4 text-foreground">Usar outra carteira?</span>
        </label>
      )}

      <TextareaField
        label="Observação do colecionador (opcional)"
        className="pt-[15px] md:col-span-2 md:w-[350px]"
        error={errors.note?.message}
        {...register('note')}
      />
    </fieldset>
  )
}
