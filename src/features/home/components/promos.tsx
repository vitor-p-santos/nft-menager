import { Link } from '@tanstack/react-router'
import promoCurves from '@/assets/decor/promo-curves.svg'
import arrowRightInk from '@/assets/icons/arrow-right-ink.svg'
import { Container } from '@/components/layout/container'
import { buttonVariants } from '@/components/ui/button-variants'
import { CATALOG_SECTION_ID } from '@/entities/catalog'
import { cn } from '@/lib/utils'
import type { Promo } from '../schemas/content'
import { ResponsiveImage } from '@/components/ui/responsive-image'

/** Cards promocionais (Figma "Promos", 586×250). O CTA aplica o filtro do catálogo vindo da API. */
export function Promos({ promos }: { promos: Promo[] }) {
  if (promos.length === 0) return null
  return (
    <section aria-label="Promoções" className="mt-16 xl:mt-24">
      <Container>
        <ul className="grid gap-6 xl:grid-cols-2 xl:gap-[30px]">
          {promos.map((promo) => (
            <li key={promo.id} className="relative flex flex-col overflow-hidden rounded-lg bg-card md:h-[250px] md:flex-row">
              <ResponsiveImage
                src={promo.image.src}
                sizes="(min-width: 768px) 290px, 100vw"
                alt=""
                width={287}
                height={250}
                loading="lazy"
                className="aspect-[287/250] w-full rounded-xl object-cover md:h-full md:w-[49%] md:shrink-0"
              />
              <img src={promoCurves} alt="" aria-hidden className="pointer-events-none absolute inset-0 hidden size-full md:block" />
              <div className="relative flex flex-1 flex-col items-end gap-2 p-6 text-right md:pt-10 md:pr-[30px] md:pb-0 md:pl-2">
                <h2 className="max-w-[270px] text-lead leading-6 font-bold text-foreground">{promo.title}</h2>
                <p className="max-w-[270px] text-body leading-6 text-muted-foreground md:line-clamp-3">{promo.description}</p>
                <Link
                  to="/"
                  search={promo.search}
                  hash={CATALOG_SECTION_ID}
                  resetScroll={false}
                  aria-label={`${promo.ctaLabel}: ${promo.title}`}
                  className={cn(buttonVariants({ size: 'lg' }), 'mt-1 w-[140px] gap-1.5 px-0 text-body-md font-medium')}
                >
                  {promo.ctaLabel}
                  <img src={arrowRightInk} alt="" width={11} height={13} className="-rotate-90" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
