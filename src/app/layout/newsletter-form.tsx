import { zodResolver } from '@hookform/resolvers/zod'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { useSubscribeNewsletter } from '@/features/home/api/queries'
import { newsletterSchema, type NewsletterInput } from '@/features/home/schemas/content'

/** "Antecipe-se ao próximo lançamento" do rodapé (carregado sob demanda pelo `SiteFooter`). */
export function NewsletterForm() {
  const inputId = useId()
  const errorId = useId()
  const subscribe = useSubscribeNewsletter()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewsletterInput>({ resolver: zodResolver(newsletterSchema) })

  const onSubmit = handleSubmit((values) =>
    subscribe.mutate(values, { onSuccess: () => reset() }),
  )

  const feedback = errors.email?.message
    ?? (subscribe.isError ? 'Não foi possível inscrever agora. Tente novamente.' : undefined)

  return (
    <form onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-3">
      <label htmlFor={inputId} className="text-lead leading-4 font-bold text-foreground">
        Antecipe-se ao próximo lançamento
      </label>
      <div className="flex h-10 items-center justify-between rounded-md bg-surface-dark pl-3 drop-shadow-[0_0_10px_rgba(10,6,4,0.45)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
        <input
          id={inputId}
          type="email"
          autoComplete="email"
          placeholder="digite seu e-mail..."
          aria-invalid={!!errors.email}
          aria-describedby={errorId}
          className="min-w-0 flex-1 bg-transparent text-body leading-4 text-foreground placeholder:text-secondary focus-visible:outline-none"
          {...register('email')}
        />
        <Button
          type="submit"
          size="none"
          disabled={subscribe.isPending}
          className="h-10 w-[85px] rounded-r-md pr-1 pl-4 text-lead leading-4 font-bold disabled:opacity-60"
        >
          Enviar
        </Button>
      </div>
      <output id={errorId} aria-live="polite" className="block text-caption-lg leading-[22px] text-muted-foreground">
        {feedback ?? (subscribe.isSuccess ? 'Inscrição confirmada! Fique de olho no seu e-mail.' : 'Receba lançamentos selecionados, histórias de criadores e novidades do mercado.')}
      </output>
    </form>
  )
}
