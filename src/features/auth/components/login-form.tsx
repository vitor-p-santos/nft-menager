import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getAuthFormError, useLogin } from '../api'
import { loginSchema, type LoginFormValues, type LoginInput } from '../schemas/auth'
import { AuthField, AuthFormError, AuthSubmit, type AuthVariant } from './auth-field'

type LoginFormProps = {
  variant: AuthVariant
  onSuccess: () => void
  onForgotPassword: () => void
}

/**
 * Formulário "Entrar" (Figma Sign In Modal `70381:239` e Mobile/Login Form `70399:241`):
 * e-mail, senha com olho, "Esqueceu a senha?" à direita e botão primário.
 */
export function LoginForm({ variant, onSuccess, onForgotPassword }: LoginFormProps) {
  const login = useLogin()
  const form = useForm<LoginFormValues, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const { errors, isSubmitting } = form.formState
  const busy = isSubmitting || login.isPending

  const submit = form.handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values)
      onSuccess()
    } catch (error) {
      const { field, message } = getAuthFormError(error)
      if (field === 'email' || field === 'password') form.setError(field, { message }, { shouldFocus: true })
      else form.setError('root', { message })
    }
  })

  return (
    <form noValidate onSubmit={submit} className="flex flex-col">
      <div className="flex flex-col gap-3">
        <AuthField
          variant={variant}
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="contato@email.com"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <AuthField
          variant={variant}
          label="Senha"
          type="password"
          autoComplete="current-password"
          placeholder="Senha"
          error={errors.password?.message}
          {...form.register('password')}
        />
      </div>
      <Button type="button" variant="link" size="none" onClick={onForgotPassword} className="mt-2.5 self-end rounded-sm text-body leading-5">
        Esqueceu a senha?
      </Button>
      <div className={cn('flex flex-col gap-3', variant === 'modal' ? 'mt-6' : 'mt-10')}>
        <AuthFormError message={errors.root?.message ?? null} />
        <AuthSubmit variant={variant} busy={busy} label="Entrar" busyLabel="Entrando..." />
      </div>
    </form>
  )
}
