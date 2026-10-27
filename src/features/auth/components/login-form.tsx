import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getAuthFormError, useLogin } from '../api'
import { loginSchema, type LoginFormValues, type LoginInput } from '../schemas/auth'
import { AuthField, AuthFormError, type AuthVariant } from './auth-field'

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
      <button
        type="button"
        onClick={onForgotPassword}
        className="mt-2.5 cursor-pointer self-end rounded-sm text-body leading-5 text-text-accent hover:underline"
      >
        Esqueceu a senha?
      </button>
      <div className={cn('flex flex-col gap-3', variant === 'modal' ? 'mt-6' : 'mt-10')}>
        <AuthFormError message={errors.root?.message ?? null} />
        <AuthSubmit variant={variant} busy={busy} label="Entrar" busyLabel="Entrando..." />
      </div>
    </form>
  )
}

/** Botão primário: 340×44 raio 6 no modal; 60px raio 10 no mobile (Figma). */
export function AuthSubmit({ variant, busy, label, busyLabel }: { variant: AuthVariant; busy: boolean; label: string; busyLabel: string }) {
  return (
    <Button
      type="submit"
      size="none"
      disabled={busy}
      aria-busy={busy || undefined}
      className={cn(
        'w-full text-body-lg leading-5 font-bold disabled:cursor-wait',
        variant === 'modal' ? 'h-11 rounded-md' : 'h-[60px] rounded-field',
      )}
    >
      {busy ? busyLabel : label}
    </Button>
  )
}
