import { Link } from '@tanstack/react-router'
import { CircleAlertIcon, LoaderCircleIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import thankYou from '@/assets/decor/thank-you.png'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

/**
 * Peças comuns aos estados do pedido no aviso do checkout (`OrderStatusDialog`) e na página do
 * pedido (`/pedidos/$orderId`), D-03: o mesmo layout do recibo, trocando ícone e mensagem.
 * O título e a descrição ficam com quem compõe (no diálogo são `DialogTitle`/`DialogDescription`).
 */

/** Tipografia do título dos estados ("Seus NFTs agora estão na sua carteira", "Aguardando…"). */
export const ORDER_STATUS_TITLE_CLASS = 'text-body-lg leading-5 font-bold text-text-secondary'

/** Arte "thank you" acima do título do pedido confirmado (68×84). */
export function ThankYouArt() {
  return <img src={thankYou} alt="" width={68} height={84} className="mx-auto" />
}

type OrderStatusMessageProps = {
  status: 'pending' | 'rejected'
  /** `output` anuncia o pendente (papel `status`) no diálogo; os demais usam `div`. */
  as?: 'div' | 'output'
  role?: 'alert'
  className?: string
  children: ReactNode
}

/** Pendente (ícone de progresso) e recusado (ícone de alerta): ícone de 64px e o conteúdo centralizados. */
export function OrderStatusMessage({ status, as: Tag = 'div', role, className, children }: OrderStatusMessageProps) {
  return (
    <Tag role={role} className={cn('flex flex-col items-center gap-5 px-6 pt-6 text-center md:px-14', className)}>
      {status === 'pending' ? (
        <LoaderCircleIcon aria-hidden className="size-16 text-primary motion-safe:animate-spin" />
      ) : (
        <CircleAlertIcon aria-hidden className="size-16 text-destructive" />
      )}
      {children}
    </Tag>
  )
}

const linkClass = cn(buttonVariants({ variant: 'link', size: 'none' }), 'rounded-sm text-body-md')

/** "Ver meus pedidos": leva à lista de pedidos ("Atividade"), onde o recibo fica guardado. */
export function MyOrdersLink({ className }: { className?: string }) {
  return (
    <Link to="/atividade" className={cn(linkClass, className)}>
      Ver meus pedidos
    </Link>
  )
}

/**
 * Ações do pedido recusado: "Tentar novamente" (`retry`, composto por quem chama), "Voltar ao
 * carrinho" (que continua intacto) e o que vier em `children`.
 */
export function RejectedOrderActions({ retry, children }: { retry: ReactNode; children?: ReactNode }) {
  return (
    <div className="mt-3 flex w-full flex-col items-center gap-3">
      {retry}
      <Link to="/carrinho" className={linkClass}>
        Voltar ao carrinho
      </Link>
      {children}
    </div>
  )
}
