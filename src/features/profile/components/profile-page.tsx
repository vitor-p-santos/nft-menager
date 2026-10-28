import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useId, useState, type FormEvent } from 'react'
import { useForm, type FieldValues, type UseFormReturn } from 'react-hook-form'
import { Skeleton } from '@/components/feedback/skeleton'
import { ErrorState } from '@/components/feedback/states'
import { buttonVariants } from '@/components/ui/button-variants'
import { InputField, PasswordField } from '@/components/ui/form-field'
import { cn } from '@/lib/utils'
import { getProfileFormErrors, profileQueries, useChangePassword, useUpdateProfile } from '../api'
import {
  changePasswordFormDefaults,
  changePasswordFormSchema,
  profileFormDefaults,
  profileFormSchemaFor,
  toChangePasswordRequest,
  type ChangePasswordFormValues,
  type ChangePasswordInput,
  type Profile,
  type ProfileFormValues,
  type ProfileInput,
} from '../schemas'
import { AvatarField } from './avatar-field'

const PROFILE_FIELDS = ['displayName', 'username', 'email', 'ensName', 'walletNickname'] as const
const PASSWORD_FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'] as const

const sectionTitle = 'text-body-md leading-5 font-bold text-foreground'

/** Valida um formulário RHF (mostrando os erros) e devolve os valores transformados ou `null`. */
function validated<V extends FieldValues, O>(form: UseFormReturn<V, unknown, O>): Promise<O | null> {
  return new Promise((resolve) => {
    void form.handleSubmit(
      (values) => resolve(values),
      () => resolve(null),
    )()
  })
}

/**
 * "Perfil do colecionador" + "Alterar senha" (Figma Desktop/Perfil `9:1238`, recorte d-08): um
 * único "Salvar", como no Figma. Ele salva os dados (`PATCH /me/profile`) e, se algum campo de
 * senha foi preenchido, também a senha (`POST /me/password`). Cada parte tem o próprio formulário
 * (RHF + Zod) e os erros da API voltam para os campos.
 */
function ProfileForms({ profile }: { profile: Profile }) {
  const titleId = useId()
  const hasWallet = profile.walletNickname !== null
  const profileForm = useForm<ProfileFormValues, unknown, ProfileInput>({
    resolver: zodResolver(profileFormSchemaFor(hasWallet)),
    defaultValues: profileFormDefaults(profile),
    mode: 'onTouched',
  })
  const passwordForm = useForm<ChangePasswordFormValues, unknown, ChangePasswordInput>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: changePasswordFormDefaults,
    mode: 'onTouched',
  })
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const [formError, setFormError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const busy = updateProfile.isPending || changePassword.isPending
  const profileErrors = profileForm.formState.errors
  const passwordErrors = passwordForm.formState.errors

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setFormError(null)
    setStatus('')
    const passwordValues = passwordForm.getValues()
    const wantsPassword = Object.values(passwordValues).some((value) => value !== '')

    const profileInput = await validated(profileForm)
    const passwordInput = wantsPassword ? await validated(passwordForm) : null
    if (!wantsPassword) passwordForm.clearErrors()
    if (!profileInput || (wantsPassword && !passwordInput)) {
      // Foco no primeiro campo com erro (dados primeiro, depois senha)
      const firstProfile = PROFILE_FIELDS.find((field) => profileForm.getFieldState(field).error)
      if (firstProfile) profileForm.setFocus(firstProfile)
      else passwordForm.setFocus(PASSWORD_FIELDS.find((field) => passwordForm.getFieldState(field).error) ?? 'currentPassword')
      return
    }

    const messages: string[] = []
    try {
      const saved = await updateProfile.mutateAsync(profileInput)
      profileForm.reset(profileFormDefaults(saved))
      messages.push('Perfil salvo.')
    } catch (error) {
      const { fields, form } = getProfileFormErrors(error, PROFILE_FIELDS)
      for (const [field, message] of Object.entries(fields)) {
        profileForm.setError(field as (typeof PROFILE_FIELDS)[number], { message }, { shouldFocus: true })
      }
      setFormError(form)
      return
    }
    if (passwordInput) {
      try {
        await changePassword.mutateAsync(toChangePasswordRequest(passwordInput))
        passwordForm.reset(changePasswordFormDefaults)
        messages.push('Senha alterada.')
      } catch (error) {
        const { fields, form } = getProfileFormErrors(error, PASSWORD_FIELDS)
        for (const [field, message] of Object.entries(fields)) {
          passwordForm.setError(field as (typeof PASSWORD_FIELDS)[number], { message }, { shouldFocus: true })
        }
        setFormError(form)
      }
    }
    setStatus(messages.join(' '))
  }

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} aria-busy={busy} className="flex flex-col">
      <section aria-labelledby={titleId}>
        <h2 id={titleId} className={sectionTitle}>
          Perfil do colecionador
        </h2>
        <fieldset disabled={busy} className="mt-[30px] grid min-w-0 grid-cols-1 gap-x-7 gap-y-6 md:grid-cols-2 xl:gap-y-[38px]">
          <legend className="sr-only">Dados do perfil</legend>
          <InputField label="Nome de exibição" required autoComplete="name" error={profileErrors.displayName?.message} {...profileForm.register('displayName')} />
          <InputField label="Nome de usuário" required autoComplete="username" error={profileErrors.username?.message} {...profileForm.register('username')} />
          <InputField label="E-mail" required type="email" autoComplete="email" error={profileErrors.email?.message} {...profileForm.register('email')} />
          <InputField
            label="Nome ENS"
            suffix=".eth"
            autoComplete="off"
            spellCheck={false}
            error={profileErrors.ensName?.message}
            {...profileForm.register('ensName')}
          />
          <InputField
            label="Apelido da carteira"
            required={hasWallet}
            disabled={!hasWallet}
            hint={hasWallet ? 'Apelido da sua carteira principal.' : 'Adicione uma carteira para definir o apelido.'}
            error={profileErrors.walletNickname?.message}
            {...profileForm.register('walletNickname')}
          />
          <AvatarField avatarUrl={profile.avatarUrl} name={profile.displayName} />
        </fieldset>
        {!hasWallet && (
          <Link to="/perfil/carteiras" className={cn(buttonVariants({ variant: 'link', size: 'none' }), 'mt-3 rounded-sm text-body')}>
            Adicionar carteira
          </Link>
        )}
      </section>

      <section aria-labelledby={`${titleId}-senha`} className="mt-10 md:w-[calc(50%-14px)]">
        <h2 id={`${titleId}-senha`} className={sectionTitle}>
          Alterar senha
        </h2>
        <p className="sr-only">Preencha só se quiser trocar a senha. As outras sessões da conta serão encerradas.</p>
        <fieldset disabled={busy} className="mt-[22px] flex flex-col gap-6">
          <legend className="sr-only">Alterar senha</legend>
          <PasswordField label="Senha atual" autoComplete="current-password" error={passwordErrors.currentPassword?.message} {...passwordForm.register('currentPassword')} />
          <PasswordField label="Nova senha" autoComplete="new-password" error={passwordErrors.newPassword?.message} {...passwordForm.register('newPassword')} />
          <PasswordField
            label="Confirmar nova senha"
            autoComplete="new-password"
            error={passwordErrors.confirmPassword?.message}
            {...passwordForm.register('confirmPassword')}
          />
        </fieldset>
      </section>

      {formError && (
        <p role="alert" className="mt-6 text-body leading-5 text-destructive">
          {formError}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={busy} className={cn(buttonVariants({ size: 'none' }), 'h-10 w-[131px] rounded-sm text-body leading-4 font-bold disabled:cursor-wait')}>
          {busy ? 'Salvando...' : 'Salvar'}
        </button>
        <output aria-live="polite" className="text-body leading-5 text-success">
          {status}
        </output>
      </div>
    </form>
  )
}

function ProfileSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-[30px]">
      <Skeleton className="h-5 w-56" />
      <div className="grid grid-cols-1 gap-x-7 gap-y-6 md:grid-cols-2 xl:gap-y-[38px]">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col gap-[7px]">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Tela "Dados do perfil" (`/perfil`, T-085). */
export function ProfilePage() {
  const profile = useQuery(profileQueries.detail())
  if (profile.data) return <ProfileForms profile={profile.data} />
  if (profile.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar o perfil"
        description="Verifique sua conexão e tente novamente."
        action={{ label: 'Tentar novamente', onClick: () => void profile.refetch() }}
      />
    )
  }
  return <ProfileSkeleton />
}
