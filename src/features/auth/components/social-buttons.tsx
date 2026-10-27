import facebookIcon from '@/assets/icons/facebook-f.svg'
import googleIcon from '@/assets/icons/google.svg'
import type { OAuthProvider } from '@/entities/session'
import { cn } from '@/lib/utils'
import { getAuthFormError, useOAuthLogin } from '../api'
import { AuthFormError, type AuthVariant } from './auth-field'

const PROVIDERS: { id: OAuthProvider; label: string; icon: string; width: number; height: number }[] = [
  { id: 'google', label: 'Continuar com Google', icon: googleIcon, width: 20, height: 20 },
  { id: 'facebook', label: 'Continuar com Facebook', icon: facebookIcon, width: 10, height: 20 },
]

/**
 * Divisor "Ou continue com" + botões Google/Facebook (Figma Social `70522:3186`). O OAuth é
 * simulado pelo MSW (`POST /auth/oauth/:provider`, D-05) e autentica a conta vinculada ao provedor.
 * No modal o divisor ocupa a largura toda do card; na página, a largura do conteúdo.
 */
export function SocialButtons({ variant, onSuccess }: { variant: AuthVariant; onSuccess: () => void }) {
  const oauth = useOAuthLogin()
  const busy = oauth.isPending

  return (
    <div className="flex flex-col">
      <div className={cn('relative flex items-center justify-center', variant === 'modal' ? '-mx-20' : '')}>
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-border" />
        <span className={cn('relative px-2.5 text-caption-lg leading-4 text-foreground', variant === 'modal' ? 'bg-surface-card' : 'bg-ink md:bg-surface-card')}>
          Ou continue com
        </span>
      </div>
      <div className={cn('flex flex-col', variant === 'modal' ? 'mt-3 gap-3' : 'mt-3 gap-4')}>
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            disabled={busy}
            aria-busy={busy && oauth.variables === provider.id ? true : undefined}
            onClick={() => oauth.mutate(provider.id, { onSuccess })}
            className="flex h-10 cursor-pointer items-center justify-center gap-2.5 rounded-sm border border-border text-caption-lg leading-4 font-medium text-text-secondary transition-colors hover:bg-surface-raised disabled:cursor-wait disabled:opacity-60"
          >
            <img src={provider.icon} alt="" width={provider.width} height={provider.height} />
            {busy && oauth.variables === provider.id ? 'Conectando...' : provider.label}
          </button>
        ))}
      </div>
      {oauth.isError && (
        <div className="mt-3">
          <AuthFormError message={getAuthFormError(oauth.error).message} />
        </div>
      )}
    </div>
  )
}
