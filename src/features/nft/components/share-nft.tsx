import shareEmail from '@/assets/icons/share-email.svg'
import shareLinkedin from '@/assets/icons/share-linkedin.svg'
import shareTwitter from '@/assets/icons/share-twitter.svg'
import { useTimedAnnouncement } from '@/components/feedback/use-timed-announcement'
import { cn } from '@/lib/utils'

function currentUrl() {
  return typeof window === 'undefined' ? '' : window.location.href
}

/**
 * "Compartilhar este NFT:" (Figma). O rótulo é o botão de compartilhamento nativo (Web Share API),
 * com fallback de copiar o link; os ícones do Figma abrem LinkedIn, e-mail e X/Twitter.
 * O resultado é anunciado num `aria-live`.
 */
export function ShareNft({ name, className }: { name: string; className?: string }) {
  const [feedback, announce] = useTimedAnnouncement<string>()

  async function share() {
    const url = currentUrl()
    const data = { title: name, text: `${name} na Kurio`, url }
    if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data)
        return
      } catch (error) {
        // Cancelado pelo usuário: não é erro nem motivo para copiar
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      announce('Link copiado para a área de transferência')
    } catch {
      announce(`Não foi possível copiar. Link: ${url}`)
    }
  }

  const url = encodeURIComponent(currentUrl())
  const text = encodeURIComponent(name)
  const links = [
    { label: 'LinkedIn', icon: shareLinkedin, width: 15, height: 14.4, href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}` },
    { label: 'e-mail', icon: shareEmail, width: 18, height: 18, href: `mailto:?subject=${text}&body=${url}` },
    { label: 'X (Twitter)', icon: shareTwitter, width: 16, height: 12.2, href: `https://twitter.com/intent/tweet?text=${text}&url=${url}` },
  ]

  return (
    <div className={cn('relative flex flex-wrap items-center gap-2', className)}>
      <button
        type="button"
        onClick={() => void share()}
        className="cursor-pointer rounded-sm text-body-md leading-4 font-bold text-foreground underline-offset-4 hover:underline"
      >
        Compartilhar este NFT:
      </button>
      <ul className="flex items-center gap-2">
        {links.map((link) => (
          <li key={link.label} className="flex">
            <a
              href={link.href}
              target={link.href.startsWith('mailto:') ? undefined : '_blank'}
              rel="noopener noreferrer"
              aria-label={`Compartilhar por ${link.label}`}
              className="flex size-[18px] items-center justify-center rounded-sm transition-opacity hover:opacity-80"
            >
              <img src={link.icon} alt="" width={link.width} height={link.height} />
            </a>
          </li>
        ))}
      </ul>
      <output aria-live="polite" className={cn('block w-full text-caption leading-[14px] text-muted-foreground', !feedback && 'sr-only')}>
        {feedback}
      </output>
    </div>
  )
}
