import { useState, type ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { FieldShell, PasswordToggle } from '@/components/ui/form-field'
import { cn } from '@/lib/utils'

/**
 * Variantes de layout das telas de auth (Figma):
 * - `modal`: Sign In/Sign Up Modal desktop (`70381:239`/`70383:239`): campo 340×40, raio 4px,
 *   fundo do card, texto Body/14.
 * - `page`: Mobile/Login e Mobile/Cadastro (`16:1022`/`16:1228`): campo 50px, raio 10px, fundo ink.
 */
export type AuthVariant = 'modal' | 'page'

const fieldClass: Record<AuthVariant, string> = {
  modal: 'h-10 rounded-sm bg-surface-card',
  page: 'h-[50px] rounded-field bg-ink',
}

/** Ícone do olho: secundário no modal e Border Soft no mobile (cores medidas nos recortes). */
const eyeClass: Record<AuthVariant, string> = {
  modal: 'text-secondary',
  page: 'text-border-soft',
}

type AuthFieldProps = Omit<ComponentProps<'input'>, 'id' | 'className'> & {
  variant: AuthVariant
  /** Rótulo acessível (o Figma só mostra o placeholder, então o rótulo fica visualmente oculto). */
  label: string
  error?: string
}

/**
 * Campo dos formulários de auth sobre o `FieldShell` (rótulo associado, `aria-invalid` e erro
 * ligado por `aria-describedby`), com o campo próprio das telas de auth. `type="password"` ganha
 * o botão de mostrar/ocultar senha.
 */
export function AuthField({ variant, label, error, type = 'text', ...inputProps }: AuthFieldProps) {
  const isPassword = type === 'password'
  const [visible, setVisible] = useState(false)

  return (
    <FieldShell label={label} hideLabel error={error} className="gap-1">
      {({ id, describedBy, invalid }) => (
        <div
          className={cn(
            'relative flex items-center border border-border transition-colors focus-within:border-primary',
            fieldClass[variant],
            invalid && 'border-destructive focus-within:border-destructive',
          )}
        >
          <input
            id={id}
            type={isPassword && visible ? 'text' : type}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(
              'size-full min-w-0 bg-transparent px-4 text-body text-foreground placeholder:text-secondary focus-visible:outline-none',
              isPassword && 'pr-12',
            )}
            {...inputProps}
          />
          {isPassword && (
            <PasswordToggle
              label={label}
              visible={visible}
              onToggle={() => setVisible((v) => !v)}
              className={eyeClass[variant]}
              iconClassName="size-5"
            />
          )}
        </div>
      )}
    </FieldShell>
  )
}

/** Erro do formulário inteiro (credenciais inválidas, e-mail já usado, rede): anunciado como alerta. */
export function AuthFormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-center text-caption leading-4 text-destructive">
      {message}
    </p>
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
