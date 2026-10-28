import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { getAuthFormError, usePasswordReset } from '../api'
import {
  PASSWORD_RESET_NEUTRAL_MESSAGE,
  passwordResetSchema,
  type PasswordResetFormValues,
  type PasswordResetInput,
} from '../schemas/auth'
import { AuthField, AuthFormError, type AuthVariant } from './auth-field'
import { AuthSubmit } from './login-form'

/**
 * "Esqueceu a senha?" (D-07): não há tela no Figma; é derivado do login (mesmo campo e botão).
 * A resposta é neutra (202) para não revelar se o e-mail existe.
 */
export function ForgotPasswordForm({ variant, onBack }: { variant: AuthVariant; onBack: () => void }) {
  const reset = usePasswordReset()
  const form = useForm<PasswordResetFormValues, unknown, PasswordResetInput>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { email: '' },
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (values) => {
    try {
      await reset.mutateAsync(values)
    } catch (error) {
      const { field, message } = getAuthFormError(error)
      if (field === 'email') form.setError('email', { message }, { shouldFocus: true })
      else form.setError('root', { message })
    }
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Mesmo lugar da descrição do login; vira a confirmação neutra depois do envio */}
      <output aria-live="polite" className="text-center text-caption-lg leading-4 text-foreground">
        {reset.isSuccess ? PASSWORD_RESET_NEUTRAL_MESSAGE : 'Informe seu e-mail e enviaremos um link para redefinir a senha.'}
      </output>
      {!reset.isSuccess && (
        <form noValidate onSubmit={submit} className="flex flex-col gap-6">
          <AuthField
            variant={variant}
            label="E-mail"
            type="email"
            autoComplete="email"
            placeholder="contato@email.com"
            error={errors.email?.message}
            {...form.register('email')}
          />
          <div className="flex flex-col gap-3">
            <AuthFormError message={errors.root?.message ?? null} />
            <AuthSubmit variant={variant} busy={isSubmitting || reset.isPending} label="Enviar link" busyLabel="Enviando..." />
          </div>
        </form>
      )}
      <Button type="button" variant="link" size="none" onClick={onBack} className="self-center text-body leading-5">
        Voltar para o login
      </Button>
    </div>
  )
}
