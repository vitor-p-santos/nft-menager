import { ImageIcon } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { getProfileFormErrors, prepareAvatar, useRemoveAvatar, useUploadAvatar } from '../api'
import { AVATAR_ACCEPT } from '../schemas'

/**
 * "Avatar" do Desktop/Perfil (d-08): círculo de 50px, "Alterar" (botão âmbar 98×40) e "Remover".
 * O arquivo é validado e reduzido no client (`prepareAvatar`), que também gera a prévia mostrada
 * enquanto o upload acontece; em erro a prévia some e a mensagem aparece ligada ao botão.
 * Ícone do círculo vazio provisório (lucide).
 */
export function AvatarField({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const id = useId()
  const errorId = `${id}-erro`
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()
  const busy = upload.isPending || remove.isPending
  const shown = preview ?? avatarUrl

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setStatus('')
    try {
      const dataUrl = await prepareAvatar(file)
      setPreview(dataUrl)
      await upload.mutateAsync(dataUrl)
      setStatus('Avatar atualizado.')
    } catch (cause) {
      const { fields, form } = getProfileFormErrors(cause, ['dataUrl'] as const)
      setError(fields.dataUrl ?? form)
    } finally {
      setPreview(null)
      // Permite escolher o mesmo arquivo de novo depois de um erro
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function onRemove() {
    setError(null)
    setStatus('')
    remove.mutate(undefined, {
      onSuccess: () => setStatus('Avatar removido.'),
      onError: (cause) => setError(getProfileFormErrors(cause, [] as const).form),
    })
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-[7px]">
      <legend className="mb-[7px] text-body-md leading-4 text-foreground">Avatar</legend>
      <div className="flex items-center gap-6">
        <span
          aria-busy={busy}
          className="flex size-[50px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-raised text-text-accent"
        >
          {shown ? (
            <img src={shown} alt={`Avatar de ${name}`} width={50} height={50} className={cn('size-full object-cover', busy && 'opacity-60')} />
          ) : (
            <ImageIcon aria-hidden className="size-6" strokeWidth={1.5} />
          )}
        </span>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={AVATAR_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
        <button
          type="button"
          disabled={busy}
          aria-describedby={error ? errorId : undefined}
          onClick={() => inputRef.current?.click()}
          className={cn(buttonVariants({ size: 'none' }), 'h-10 w-[98px] rounded-sm text-body leading-4 font-bold')}
        >
          {upload.isPending ? 'Enviando...' : 'Alterar'}
          <span className="sr-only"> avatar (PNG, JPEG ou WebP, até 2 MB)</span>
        </button>
        <button
          type="button"
          disabled={busy || !avatarUrl}
          onClick={onRemove}
          className="cursor-pointer rounded-sm text-body leading-4 text-foreground hover:text-text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Remover
          <span className="sr-only"> avatar</span>
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-caption leading-4 text-destructive">
          {error}
        </p>
      )}
      <output aria-live="polite" className="sr-only">
        {status}
      </output>
    </fieldset>
  )
}
