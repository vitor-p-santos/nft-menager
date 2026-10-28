import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/feedback/skeleton'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { Container } from '@/components/layout/container'
import { buttonVariants } from '@/components/ui/button-variants'
import { ApiError } from '@/lib/api'
import { pageQueryOptions } from '../api/queries'
import type { PageSlug } from '../schemas/page'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

function BackHome() {
  return (
    <Link to="/" className={buttonVariants({ size: 'lg' })}>
      Voltar ao início
    </Link>
  )
}

/**
 * Página institucional (D-10). Não há frame no Figma: segue os tokens e o padrão das outras
 * telas (título em Heading/Display, texto Body/14 em `text-secondary`, blocos em `bg-card`).
 */
export function InstitutionalPage({ slug }: { slug: PageSlug }) {
  const { data: page, error, isError, refetch } = useQuery(pageQueryOptions(slug))

  if (isError && error instanceof ApiError && error.kind === 'not_found') {
    return <PageNotFound />
  }

  return (
    <Container className="py-10 md:py-16">
      {page ? (
        <article className="mx-auto flex max-w-3xl flex-col gap-8">
          <header className="flex flex-col gap-3">
            <h1 className="text-heading leading-8 font-bold text-foreground xl:text-display xl:leading-[70px]">{page.title}</h1>
            <p className="text-body-lg leading-6 text-text-secondary">{page.summary}</p>
            <p className="text-caption leading-4 text-muted-foreground">
              Atualizado em <time dateTime={page.updatedAt}>{dateFormatter.format(new Date(page.updatedAt))}</time>
            </p>
          </header>
          {page.sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-3 rounded-lg bg-card p-6">
              <h2 className="text-lead leading-6 font-bold text-text-accent">{section.heading}</h2>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index} className="text-body leading-6 text-foreground">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>
      ) : isError ? (
        <ErrorState
          title="Não foi possível carregar esta página"
          description="Verifique sua conexão e tente novamente."
          action={{ label: 'Tentar novamente', onClick: () => void refetch() }}
        />
      ) : (
        <div aria-hidden className="mx-auto flex max-w-3xl flex-col gap-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      )}
    </Container>
  )
}

export function PageNotFound() {
  return (
    <Container className="py-16">
      <EmptyState title="Página não encontrada" description="O endereço pode estar incorreto ou a página foi removida." action={<BackHome />} />
    </Container>
  )
}
