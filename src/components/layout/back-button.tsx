import { useCanGoBack, useRouter } from '@tanstack/react-router'
import arrowBack from '@/assets/icons/arrow-back.svg'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

/** Destino do "Voltar" quando não há histórico (entrada direta pela URL). */
export type BackFallback = { to: '/' | '/carrinho' | '/atividade'; hash?: string }

type BackButtonProps = {
  fallback: BackFallback
  className?: string
}

/** Voltar (topo mobile, círculo de 35px): volta no histórico quando possível; senão, `fallback`. */
export function BackButton({ fallback, className }: BackButtonProps) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => (canGoBack ? router.history.back() : void router.navigate(fallback))}
      className={cn(buttonVariants({ variant: 'round', size: 'none' }), 'size-[35px]', className)}
    >
      <img src={arrowBack} alt="" width={13} height={7} className="rotate-90" />
    </button>
  )
}
