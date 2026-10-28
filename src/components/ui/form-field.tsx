import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { controlClass, Input } from './input'
import { Select, SelectOption } from './select'

/**
 * Campos de formulário do app (checkout, perfil e carteiras): rótulo Body/15 com asterisco de
 * obrigatório + controle base (`Input`/`Select`, medidas do Figma em `input.tsx`) + dica e erro,
 * ligados ao controle por `aria-describedby`/`aria-invalid`.
 */
type FieldShellProps = {
  label: string
  /** Rótulo visualmente oculto (campo sem rótulo no Figma, ex.: "ENS ou carteira secundária"). */
  hideLabel?: boolean
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
}

/** Rótulo + controle + erro, com `aria-describedby`/`aria-invalid` ligados ao controle. */
export function FieldShell({ label, hideLabel, required, error, hint, className, children }: FieldShellProps) {
  const id = useId()
  const errorId = `${id}-erro`
  const hintId = `${id}-dica`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex min-w-0 flex-col gap-[7px]', className)}>
      <label htmlFor={id} className={cn('text-body-md leading-4 text-foreground', hideLabel && 'sr-only')}>
        {label}
        {required && (
          <>
            <span aria-hidden className="ml-0.5 text-destructive">
              *
            </span>
            <span className="sr-only"> (obrigatório)</span>
          </>
        )}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && (
        <p id={hintId} className="text-caption leading-4 text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-caption leading-4 text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

type InputFieldProps = Omit<ComponentProps<'input'>, 'id' | 'className'> &
  Pick<FieldShellProps, 'label' | 'hideLabel' | 'required' | 'error' | 'hint' | 'className'> & {
    inputClassName?: string
    /** Texto fixo à direita dentro do campo (ex.: ".eth"). */
    suffix?: string
  }

export function InputField({ label, hideLabel, required, error, hint, className, inputClassName, suffix, ...props }: InputFieldProps) {
  return (
    <FieldShell label={label} hideLabel={hideLabel} required={required} error={error} hint={hint} className={className}>
      {({ id, describedBy, invalid }) =>
        suffix ? (
          <div className="relative">
            <Input
              id={id}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              aria-required={required || undefined}
              className={cn('pr-14', inputClassName)}
              {...props}
            />
            <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-body-lg text-foreground">
              {suffix}
            </span>
          </div>
        ) : (
          <Input
            id={id}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            className={inputClassName}
            {...props}
          />
        )
      }
    </FieldShell>
  )
}

type SelectFieldProps = Omit<ComponentProps<'select'>, 'id' | 'className' | 'children'> &
  Pick<FieldShellProps, 'label' | 'required' | 'error' | 'className'> & {
    placeholder: string
    options: readonly { value: string; label: string }[]
  }

/** Select nativo (`Select`) com a opção-placeholder desabilitada. */
export function SelectField({ label, required, error, className, placeholder, options, ...props }: SelectFieldProps) {
  return (
    <FieldShell label={label} required={required} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <Select
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          required={required}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <SelectOption key={option.value} value={option.value}>
              {option.label}
            </SelectOption>
          ))}
        </Select>
      )}
    </FieldShell>
  )
}

type TextareaFieldProps = Omit<ComponentProps<'textarea'>, 'id' | 'className'> &
  Pick<FieldShellProps, 'label' | 'error' | 'className'>

export function TextareaField({ label, error, className, ...props }: TextareaFieldProps) {
  return (
    <FieldShell label={label} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(controlClass, 'h-[152px] resize-none py-3 leading-5')}
          {...props}
        />
      )}
    </FieldShell>
  )
}

type PasswordFieldProps = Omit<ComponentProps<'input'>, 'id' | 'className' | 'type'> &
  Pick<FieldShellProps, 'label' | 'required' | 'error' | 'className'>

/**
 * Senha com mostrar/ocultar (Desktop/Perfil, "Alterar senha"): o olho fica dentro do campo, à direita.
 * Ícone provisório do lucide, como nas telas de auth (o vetor do Figma não foi baixado).
 */
export function PasswordField({ label, required, error, className, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  return (
    <FieldShell label={label} required={required} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <Input
            id={id}
            type={visible ? 'text' : 'password'}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            className="pr-12"
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
            aria-pressed={visible}
            className="absolute inset-y-0 right-3 my-auto flex size-7 cursor-pointer items-center justify-center rounded-sm text-secondary"
          >
            {visible ? <EyeIcon aria-hidden className="size-[18px]" /> : <EyeOffIcon aria-hidden className="size-[18px]" />}
          </button>
        </div>
      )}
    </FieldShell>
  )
}
