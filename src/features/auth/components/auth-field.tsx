import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useId, useState, type ComponentProps } from 'react'
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
 * Campo dos formulários de auth: rótulo associado, `aria-invalid` e mensagem de erro ligada por
 * `aria-describedby`. `type="password"` ganha o botão de mostrar/ocultar senha.
 */
export function AuthField({ variant, label, error, type = 'text', ...inputProps }: AuthFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const isPassword = type === 'password'
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={cn(
          'relative flex items-center border border-border transition-colors focus-within:border-primary',
          fieldClass[variant],
          error && 'border-destructive focus-within:border-destructive',
        )}
      >
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'size-full min-w-0 bg-transparent px-4 text-body text-foreground placeholder:text-secondary focus-visible:outline-none',
            isPassword && 'pr-12',
          )}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
            aria-pressed={visible}
            className={cn('absolute right-3 flex size-7 cursor-pointer items-center justify-center rounded-sm', eyeClass[variant])}
          >
            {visible ? <EyeIcon aria-hidden className="size-5" /> : <EyeOffIcon aria-hidden className="size-5" />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-caption leading-4 text-destructive">
          {error}
        </p>
      )}
    </div>
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
