import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { getAuthFormError, useRegister } from '../api'
import { registerSchema, toRegisterRequest, type RegisterFormValues, type RegisterInput } from '../schemas/auth'
import { AuthField, AuthFormError, AuthSubmit, type AuthVariant } from './auth-field'

/**
 * Formulário "Criar conta" (Figma Sign Up Modal `70383:239` e Mobile/Cadastro Form `70399:250`):
 * usuário, e-mail, senha e confirmação. O cadastro já devolve a sessão (usuário entra direto).
 */
export function RegisterForm({ variant, onSuccess }: { variant: AuthVariant; onSuccess: () => void }) {
  const register = useRegister()
  const form = useForm<RegisterFormValues, unknown, RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })
  const { errors, isSubmitting } = form.formState
  const busy = isSubmitting || register.isPending

  const submit = form.handleSubmit(async (values) => {
    try {
      await register.mutateAsync(toRegisterRequest(values))
      onSuccess()
    } catch (error) {
      // 409 `email_taken`/`username_taken` e 422 por campo vão para o campo; o resto, para o alerta
      const { field, message } = getAuthFormError(error)
      if (field) form.setError(field, { message }, { shouldFocus: true })
      else form.setError('root', { message })
    }
  })

  return (
    <form noValidate onSubmit={submit} className="flex flex-col">
      <div className="flex flex-col gap-3">
        <AuthField
          variant={variant}
          label="Nome de usuário"
          autoComplete="username"
          placeholder="Nome de usuário"
          error={errors.username?.message}
          {...form.register('username')}
        />
        <AuthField
          variant={variant}
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="Digite seu e-mail"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <AuthField
          variant={variant}
          label="Senha"
          type="password"
          autoComplete="new-password"
          placeholder="Senha"
          error={errors.password?.message}
          {...form.register('password')}
        />
        <AuthField
          variant={variant}
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          placeholder="Confirmar senha"
          error={errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />
      </div>
      <div className={cn('flex flex-col gap-3', variant === 'modal' ? 'mt-6' : 'mt-10')}>
        <AuthFormError message={errors.root?.message ?? null} />
        <AuthSubmit
          variant={variant}
          busy={busy}
          label={variant === 'modal' ? 'Criar conta' : 'Criar perfil'}
          busyLabel="Criando..."
        />
      </div>
    </form>
  )
}
