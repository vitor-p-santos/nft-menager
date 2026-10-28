import { Link } from '@tanstack/react-router'
import { PauseIcon, PlayIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import heroBannerMobile from '@/assets/decor/hero-banner-mobile.svg'
import arrowRightAccent from '@/assets/icons/arrow-right-accent.svg'
import { Skeleton } from '@/components/feedback/skeleton'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { ResponsiveImage } from '@/components/ui/responsive-image'
import { CATALOG_SECTION_ID } from '@/entities/catalog'
import { MD_QUERY, useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '../hooks/use-reduced-motion'
import type { HeroSlide } from '../schemas/content'

const AUTOPLAY_MS = 6_000

function Dots({
  slides,
  current,
  onSelect,
  controlsId,
  className,
}: {
  slides: HeroSlide[]
  current: number
  onSelect: (index: number) => void
  controlsId: string
  className?: string
}) {
  return (
    <div className={cn('flex items-center', className)}>
      {slides.map((slide, index) => (
        <button
          key={slide.id}
          type="button"
          aria-controls={controlsId}
          aria-label={`Mostrar destaque ${index + 1} de ${slides.length}`}
          aria-current={index === current ? 'true' : undefined}
          onClick={() => onSelect(index)}
          // Área de toque de 16px (espaçamento dos pontos no Figma) em volta do ponto de 7–8px
          className="group flex size-4 cursor-pointer items-center justify-center"
        >
          <span
            className={cn(
              'block size-[7px] rounded-full bg-primary transition-opacity md:size-2',
              index === current ? 'opacity-100' : 'opacity-40 group-hover:opacity-70',
            )}
          />
        </button>
      ))}
    </div>
  )
}

/**
 * Hero com carrossel (Figma "Top" desktop e "Hero" mobile). Avança sozinho a cada 6s, pausa no
 * hover/foco e com o botão de pausa; não avança com `prefers-reduced-motion`.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [current, setCurrent] = useState(0)
  // Só a arte da variante visível carrega já (a outra fica `lazy`, oculta)
  const desktop = useMediaQuery(MD_QUERY)
  const [paused, setPaused] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const slideId = useId()
  const regionRef = useRef<HTMLElement>(null)
  const total = slides.length
  const autoplay = total > 1 && !reducedMotion && !paused && !interacting

  const select = useCallback((index: number) => setCurrent(((index % total) + total) % total), [total])

  useEffect(() => {
    if (!autoplay) return
    const timer = window.setInterval(() => setCurrent((c) => (c + 1) % total), AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [autoplay, total])

  // Pausa enquanto o ponteiro ou o foco estão no carrossel (WCAG 2.2.2)
  useEffect(() => {
    const region = regionRef.current
    if (!region) return
    const start = () => setInteracting(true)
    const stop = () => setInteracting(false)
    const blur = (event: FocusEvent) => {
      if (!region.contains(event.relatedTarget as Node | null)) stop()
    }
    region.addEventListener('pointerenter', start)
    region.addEventListener('pointerleave', stop)
    region.addEventListener('focusin', start)
    region.addEventListener('focusout', blur)
    return () => {
      region.removeEventListener('pointerenter', start)
      region.removeEventListener('pointerleave', stop)
      region.removeEventListener('focusin', start)
      region.removeEventListener('focusout', blur)
    }
  }, [])

  const slide = slides[current] ?? slides[0]
  if (!slide) return null

  const cta = (
    <Link to="/" hash={CATALOG_SECTION_ID} resetScroll={false} search={(prev) => prev}>
      {slide.ctaLabel}
    </Link>
  )

  return (
    <section ref={regionRef} aria-roledescription="carrossel" aria-label="Destaques da Kurio">
      <Container className="relative">
        {total > 1 && !reducedMotion && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="sr-only z-10 rounded-md bg-surface-card px-3 py-2 text-body text-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-8"
          >
            {paused ? <PlayIcon aria-hidden className="mr-1 inline size-4" /> : <PauseIcon aria-hidden className="mr-1 inline size-4" />}
            {paused ? 'Retomar destaques' : 'Pausar destaques'}
          </button>
        )}

        <article
          id={slideId}
          aria-roledescription="slide"
          aria-label={`${current + 1} de ${total}`}
          aria-live={autoplay ? 'off' : 'polite'}
        >
          {/* Mobile: card 366×190 com fundo do Figma (hero-banner-mobile) */}
          <div key={`m-${slide.id}`} className="relative mt-4 h-[190px] overflow-hidden rounded-[30px] animate-in fade-in duration-500 md:hidden">
            <img src={heroBannerMobile} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
            <div className="relative flex h-full flex-col py-3.5 pr-[calc(35%+20px)] pl-4">
              <p className="text-caption leading-4 font-medium text-foreground">{slide.eyebrow}</p>
              <h1 className="mt-2 text-lead leading-[29px] font-bold text-foreground">{slide.mobileTitle}</h1>
              <p className="mt-1 text-caption leading-5 tracking-[-0.02em] text-muted-foreground">{slide.mobileDescription}</p>
              <Link
                to="/"
                hash={CATALOG_SECTION_ID}
                resetScroll={false}
                search={(prev) => prev}
                className="mt-auto mb-5 flex w-max items-center gap-2 rounded-sm text-caption-lg leading-4 font-bold text-text-accent"
              >
                {slide.ctaLabel}
                <img src={arrowRightAccent} alt="" width={10} height={12} className="-rotate-90" />
              </Link>
            </div>
            <ResponsiveImage
              src={slide.image.src}
              sizes="138px"
              alt={slide.image.alt}
              width={138}
              height={138}
              loading={desktop ? 'lazy' : 'eager'}
              className="absolute top-2.5 right-4 aspect-square w-[35%] max-w-[138px] rounded-xl object-cover"
            />
            <ResponsiveImage
              src={slide.secondaryImage.src}
              sizes="58px"
              alt={slide.secondaryImage.alt}
              width={58}
              height={58}
              loading={desktop ? 'lazy' : 'eager'}
              className="absolute top-[99px] right-[calc(35%-56px)] size-[58px] rounded-xl object-cover"
            />
            <Dots slides={slides} current={current} onSelect={select} controlsId={slideId} className="absolute bottom-0.5 left-1/2 -translate-x-1/2" />
          </div>

          {/* Tablet/desktop: texto à esquerda, arte 450×450 (raio 24) à direita */}
          <div key={`d-${slide.id}`} className="hidden items-center justify-between gap-10 pt-8 animate-in fade-in duration-500 md:flex">
            <div className="flex min-w-0 flex-col items-start xl:pl-10">
              <p className="text-body leading-normal font-medium tracking-[0.1em] text-foreground">{slide.eyebrow}</p>
              <h1 className="mt-3 max-w-[560px] text-heading leading-10 font-bold tracking-[0.02em] text-foreground xl:text-display xl:leading-[70px]">
                {slide.title}
              </h1>
              <p className="mt-3 max-w-[560px] text-caption-lg leading-6 text-muted-foreground">{slide.description}</p>
              <Button asChild size="lg" className="mt-8 w-[140px]">
                {cta}
              </Button>
              <Dots slides={slides} current={current} onSelect={select} controlsId={slideId} className="mt-10 self-end" />
            </div>
            {/* LCP do Início no tablet/desktop; no mobile fica oculta e `lazy` */}
            <ResponsiveImage
              src={slide.image.src}
              sizes="(min-width: 1280px) 450px, 42vw"
              alt={slide.image.alt}
              width={450}
              height={450}
              loading={desktop ? 'eager' : 'lazy'}
              fetchPriority={desktop ? 'high' : 'auto'}
              className="aspect-square w-[42%] max-w-[450px] shrink-0 rounded-3xl object-cover"
            />
          </div>
        </article>
      </Container>
    </section>
  )
}

export function HeroSkeleton() {
  return (
    <Container aria-hidden>
      <Skeleton className="mt-4 h-[190px] rounded-[30px] md:hidden" />
      <div className="hidden items-center justify-between gap-10 pt-8 md:flex">
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-12 w-4/5" />
          <Skeleton className="h-12 w-3/5" />
          <Skeleton className="h-16 w-4/5" />
          <Skeleton className="h-10 w-[140px]" />
        </div>
        <Skeleton className="aspect-square w-[42%] max-w-[450px] rounded-3xl" />
      </div>
    </Container>
  )
}
