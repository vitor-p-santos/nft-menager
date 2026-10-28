import { useRef, useState, type MouseEvent, type ReactNode } from 'react'
import zoomIcon from '@/assets/icons/zoom.svg'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ResponsiveImage } from '@/components/ui/responsive-image'
import type { Image } from '@/entities/nft'
import { MD_QUERY, useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

/**
 * Galeria do detalhe.
 * Desktop (Figma "Product Images", 573×448): 4 miniaturas de 100px (ativa com borda Color/Primary),
 * imagem principal 444px em Surface Card com arte de 404px (raio 24) e botão de zoom de 30px.
 * Mobile (Figma "Hero"): arte de 361×356 (raio 24) com paginador (pílula ativa + pontos de 7px).
 * O zoom abre um diálogo modal (foco preso, Esc fecha, foco volta ao botão).
 */
export function NftGallery({ images, name, mobileTopBar }: { images: Image[]; name: string; mobileTopBar?: ReactNode }) {
  const [active, setActive] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  // Só a arte da variante visível tem prioridade (mobile × desktop renderizam as duas)
  const desktop = useMediaQuery(MD_QUERY)
  // Diálogo controlado (sem Trigger): devolve o foco ao botão que abriu o zoom
  const openerRef = useRef<HTMLButtonElement | null>(null)
  function openZoom(event: MouseEvent<HTMLButtonElement>) {
    openerRef.current = event.currentTarget
    setZoomOpen(true)
  }
  // O schema garante ao menos uma imagem (`images.min(1)`)
  const current = images[Math.min(active, images.length - 1)] ?? images[0]!
  const label = (i: number) => `Ver imagem ${i + 1} de ${images.length}`

  return (
    <>
      {/* Mobile: hero com gradiente, botões voltar/favoritar e arte */}
      <div className="bg-[image:var(--gradient-detail-hero)] px-6 pt-[23px] pb-[30px] md:hidden">
        {mobileTopBar}
        <div className="relative mt-2">
          <button type="button" onClick={openZoom} aria-label={`Ampliar imagem de ${name}`} className="block w-full cursor-zoom-in rounded-3xl">
            {/* LCP no mobile; no desktop fica oculta e `lazy` (não baixa) */}
            <ResponsiveImage
              src={current.src}
              sizes="calc(100vw - 48px)"
              alt={current.alt}
              width={current.width}
              height={current.height}
              loading={desktop ? 'lazy' : 'eager'}
              fetchPriority={desktop ? 'auto' : 'high'}
              className="aspect-[361/356] w-full rounded-3xl object-cover"
            />
          </button>
          {images.length > 1 && (
            <div className="absolute inset-x-0 bottom-[50px] flex justify-center gap-[7px]">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={label(i)}
                  aria-current={i === active}
                  onClick={() => setActive(i)}
                  className={cn(
                    'relative h-[7px] cursor-pointer rounded-full bg-primary transition-[width] before:absolute before:-inset-2 before:content-[""]',
                    i === active ? 'w-7' : 'w-[7px]',
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop/tablet: miniaturas + imagem principal */}
      <div className="hidden w-full max-w-[573px] shrink-0 items-start gap-7 md:flex">
        <ul aria-label="Imagens do NFT" className="flex w-[100px] shrink-0 flex-col gap-4">
          {images.map((image, i) => (
            <li key={i}>
              <button
                type="button"
                aria-label={label(i)}
                aria-current={i === active}
                onClick={() => setActive(i)}
                className={cn(
                  'block size-[100px] cursor-pointer overflow-hidden rounded-lg border bg-card',
                  i === active ? 'border-primary' : 'border-transparent',
                )}
              >
                <ResponsiveImage src={image.src} sizes="100px" alt="" width={100} height={100} loading="lazy" decoding="async" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
        <div className="relative aspect-square min-w-0 flex-1 rounded-md bg-card p-4">
          {/* LCP no desktop/tablet; no mobile fica oculta e `lazy` */}
          <ResponsiveImage
            src={current.src}
            sizes="404px"
            alt={current.alt}
            width={current.width}
            height={current.height}
            loading={desktop ? 'eager' : 'lazy'}
            fetchPriority={desktop ? 'high' : 'auto'}
            className="aspect-square w-full rounded-3xl object-cover"
          />
          <button
            type="button"
            onClick={openZoom}
            aria-label={`Ampliar imagem de ${name}`}
            className="absolute top-[15px] right-3 size-[30px] cursor-zoom-in rounded-full"
          >
            <img src={zoomIcon} alt="" width={30} height={30} />
          </button>
        </div>
      </div>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            openerRef.current?.focus()
          }}
          className="max-h-[calc(100dvh-2rem)] w-auto max-w-[min(calc(100%-2rem),900px)] border-border bg-card p-4 sm:max-w-[min(calc(100%-2rem),900px)]">
          <DialogTitle className="sr-only">{name}</DialogTitle>
          <DialogDescription className="sr-only">
            Imagem {Math.min(active, images.length - 1) + 1} de {images.length}, ampliada
          </DialogDescription>
          <ResponsiveImage
            src={current.src}
            sizes="min(calc(100vw - 4rem), 868px)"
            alt={current.alt}
            width={current.width}
            height={current.height}
            className="aspect-square max-h-[calc(100dvh-4rem)] w-full rounded-3xl object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
