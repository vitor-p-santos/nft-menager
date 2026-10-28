import { ResponsiveImage } from '@/components/ui/responsive-image'
import type { Order } from '@/entities/order'
import { cn } from '@/lib/utils'

/** Miniatura do primeiro item do pedido (ou um bloco vazio do mesmo tamanho). */
export function OrderThumb({ order, size, className }: { order: Order; size: number; className?: string }) {
  const image = order.items[0]?.nft.image
  return image ? (
    <ResponsiveImage src={image.src} sizes={`${size}px`} alt="" width={size} height={size} loading="lazy" className={cn('shrink-0 object-cover', className)} />
  ) : (
    <span aria-hidden style={{ width: size, height: size }} className={cn('shrink-0 bg-muted', className)} />
  )
}
