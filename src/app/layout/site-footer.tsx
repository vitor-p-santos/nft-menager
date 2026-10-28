import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import facebook from '@/assets/icons/social-facebook.svg'
import instagram from '@/assets/icons/social-instagram.svg'
import linkedin from '@/assets/icons/social-linkedin.svg'
import twitter from '@/assets/icons/social-twitter.svg'
import youtube from '@/assets/icons/social-youtube.svg'
import { Skeleton } from '@/components/feedback/skeleton'
import { Container } from '@/components/layout/container'
import { Badge } from '@/components/ui/badge'
import { CATALOG_SECTION_ID } from '@/entities/catalog'
import { siteQueryOptions } from '@/features/home/api/queries'
import type { SiteSettings } from '@/features/home/schemas/content'
import type { PageSlug } from '@/features/pages/schemas/page'
import { cn } from '@/lib/utils'

// O formulário (RHF + Zod) carrega à parte (T-101): o rodapé fica abaixo da dobra e some no mobile,
// então o react-hook-form sai do caminho crítico. O espaço fica reservado enquanto carrega.
const NewsletterForm = lazy(() => import('./newsletter-form').then((m) => ({ default: m.NewsletterForm })))

type FooterLink = { label: string } & (
  | { kind: 'page'; slug: PageSlug }
  /** Rota privada do app (sem sessão, `requireAuth` leva a /entrar e volta). */
  | { kind: 'route'; to: '/atividade' | '/perfil' | '/perfil/lista-de-interesse' }
  /** Sem tela ("Minha coleção", fora do spec): "Disponível em breve". */
  | { kind: 'soon' }
)

/** Colunas de links das telas do app (research.md, D-10). A coluna "Coleções" vem de `GET /content/site`. */
const LINK_COLUMNS: { title: string; items: FooterLink[] }[] = [
  {
    title: 'Meu perfil',
    items: [
      { label: 'Meu perfil', kind: 'route', to: '/perfil' },
      { label: 'Minha coleção', kind: 'soon' },
      { label: 'Atividade', kind: 'route', to: '/atividade' },
      { label: 'Estúdio do criador', kind: 'page', slug: 'estudio-do-criador' },
      { label: 'Lista de interesse', kind: 'route', to: '/perfil/lista-de-interesse' },
    ],
  },
  {
    title: 'Central de ajuda',
    items: [
      { label: 'Central de ajuda', kind: 'page', slug: 'central-de-ajuda' },
      { label: 'Como comprar NFTs', kind: 'page', slug: 'como-comprar' },
      { label: 'Carteira e segurança', kind: 'page', slug: 'carteira-e-seguranca' },
      { label: 'Política do mercado', kind: 'page', slug: 'politica-do-mercado' },
      { label: 'Denunciar item', kind: 'page', slug: 'denunciar-item' },
    ],
  },
]

/** Ícones originais do Figma por rede; URL e rótulo vêm de `GET /content/site`. */
const SOCIAL_ICONS: Record<SiteSettings['socials'][number]['id'], string> = {
  facebook,
  instagram,
  twitter,
  linkedin,
  youtube,
}

const linkClass = 'rounded-sm hover:text-text-accent'

function FooterLinkItem({ item }: { item: FooterLink }) {
  switch (item.kind) {
    case 'page':
      return (
        <Link to="/paginas/$slug" params={{ slug: item.slug }} className={linkClass}>
          {item.label}
        </Link>
      )
    case 'route':
      return (
        <Link to={item.to} className={linkClass}>
          {item.label}
        </Link>
      )
    case 'soon':
      return (
        <button type="button" aria-disabled title="Disponível em breve" className="cursor-not-allowed rounded-sm text-left">
          {item.label}
          <span className="sr-only"> (disponível em breve)</span>
        </button>
      )
  }
}

function useSiteSettings() {
  return useQuery(siteQueryOptions())
}

function ContactLinks() {
  const { data } = useSiteSettings()
  if (!data) {
    return (
      <>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-36" />
      </>
    )
  }
  return (
    <>
      <a href={`mailto:${data.contact.email}`} className={cn('text-body leading-[22px] text-foreground', linkClass)}>
        {data.contact.email}
      </a>
      <a href={data.contact.phoneHref} className={cn('text-body leading-[22px] text-foreground', linkClass)}>
        {data.contact.phone}
      </a>
    </>
  )
}

/** Destaques do topo (letra no círculo âmbar, título e texto). Skeleton com a mesma geometria. */
function Features() {
  const { data } = useSiteSettings()
  const items = data?.features ?? Array.from({ length: 3 }, () => null)
  return (
    <ul aria-busy={!data} className="grid grid-cols-3 laptop:contents">
      {items.map((feature, i) => (
        <li
          key={feature?.id ?? i}
          className={cn('flex flex-col gap-3 px-4 laptop:w-[264px]', i === 0 && 'laptop:flex-1', i > 0 && 'border-l border-primary')}
        >
          {feature ? (
            <>
              <span aria-hidden className="flex size-[74px] items-center justify-center rounded-full bg-primary text-heading font-bold text-primary-foreground">
                {feature.letter}
              </span>
              <h2 className="text-body-xl leading-4 font-bold text-foreground">{feature.title}</h2>
              <p className="max-w-[204px] text-body leading-[22px] text-muted-foreground">{feature.text}</p>
            </>
          ) : (
            <>
              <Skeleton className="size-[74px] rounded-full" />
              <Skeleton className="h-4 w-40" />
              {/* 4 linhas de 22px, a altura do texto mais longo */}
              <Skeleton className="h-[88px] max-w-[204px]" />
            </>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Coluna "Coleções": atalhos para o catálogo filtrado. Skeleton com 5 linhas da mesma altura (30px). */
function CollectionLinks() {
  const { data } = useSiteSettings()
  return (
    <nav aria-label="Coleções" className="flex flex-col gap-2">
      <h2 className="text-lead leading-4 font-bold text-foreground">Coleções</h2>
      <ul aria-busy={!data} className="text-body leading-[30px] text-foreground">
        {data
          ? data.collections.map((collection) => (
              <li key={collection.categoryId}>
                <Link to="/" search={{ categories: [collection.categoryId] }} hash={CATALOG_SECTION_ID} className={linkClass}>
                  {collection.label}
                </Link>
              </li>
            ))
          : Array.from({ length: 5 }, (_, i) => (
              <li key={i} aria-hidden className="flex h-[30px] items-center">
                <Skeleton className="h-4 w-28" />
              </li>
            ))}
      </ul>
    </nav>
  )
}

function SocialLinks() {
  const { data } = useSiteSettings()
  if (!data) {
    return (
      <ul aria-hidden className="flex items-center gap-2.5">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i}>
            <Skeleton className="size-[30px]" />
          </li>
        ))}
      </ul>
    )
  }
  return (
    <ul className="flex items-center gap-2.5">
      {data.socials.map((social) => (
        <li key={social.id}>
          <a
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${social.label} (abre em nova aba)`}
            className="block rounded-[5px] transition-opacity hover:opacity-80"
          >
            <img src={SOCIAL_ICONS[social.id]} alt="" width={32} height={32} className="size-[30px]" />
          </a>
        </li>
      ))}
    </ul>
  )
}

/** Footer desktop (Figma "Footer", 1200 de largura). Conteúdo idêntico em todas as telas. */
export function SiteFooter() {
  return (
    <footer className="hidden pb-6 md:block">
      <Container>
        <div className="flex flex-col gap-8 bg-card p-8 laptop:h-[250px] laptop:flex-row laptop:items-stretch laptop:justify-between laptop:gap-0">
          <Features />
          <div className="px-4 laptop:w-[357px] laptop:border-l laptop:border-primary">
            <Suspense fallback={<div aria-hidden className="h-[124px]" />}>
              <NewsletterForm />
            </Suspense>
          </div>
        </div>

        {/* Figma: uma linha só, 88px, itens centrados na vertical. O layout do Figma vale a partir de 1280 (laptop);
            de 1024 a 1279 a grade de 4 colunas com gap-8 alinha KURIO e o e-mail às 2 colunas de links de baixo.
            No tablet (md) os itens ficam na largura natural; py-[22px] = (88 − 44) / 2 do texto de 2 linhas */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 bg-surface-dark px-8 py-[22px] lg:grid lg:h-[88px] lg:grid-cols-4 lg:py-0 laptop:grid-cols-[1fr_1fr_1fr_228px] laptop:gap-[92px]">
          <span className="text-body font-bold tracking-[0.1em] text-foreground">KURIO</span>
          <p className="text-body leading-[22px] whitespace-nowrap text-foreground">
            Feito para colecionadores,
            <br />
            criadores e cultura
          </p>
          <ContactLinks />
        </div>

        <div className="grid grid-cols-2 gap-8 bg-card p-8 laptop:h-[236px] laptop:grid-cols-[1fr_1fr_1fr_228px] laptop:gap-[124px]">
          {LINK_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title} className="flex flex-col gap-2">
              <h2 className="text-lead leading-4 font-bold text-foreground">{column.title}</h2>
              <ul className="text-body leading-[30px] text-foreground">
                {column.items.map((item) => (
                  <li key={item.label}>
                    <FooterLinkItem item={item} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <CollectionLinks />
          <div className="flex flex-col gap-8">
            <div className="flex w-[190px] flex-col gap-5">
              <h2 className="text-lead leading-4 font-bold text-foreground">Redes sociais</h2>
              <SocialLinks />
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-lead leading-4 font-bold whitespace-nowrap text-foreground">Carteiras compatíveis</h2>
              <Badge asChild variant="seal" className="justify-center pr-0">
                <p>{'METAMASK  •  WALLETCONNECT  •  COINBASE'}</p>
              </Badge>
            </div>
          </div>
        </div>
      </Container>
      <p className="mt-1.5 text-center text-body leading-[30px] text-foreground">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
