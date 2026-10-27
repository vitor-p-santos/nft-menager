import { createFileRoute, notFound } from '@tanstack/react-router'
import { pageQueryOptions } from '@/features/pages/api/queries'
import { InstitutionalPage, PageNotFound } from '@/features/pages/components/institutional-page'
import { pageSlugSchema } from '@/features/pages/schemas/page'

/** Páginas institucionais do footer (research.md, D-10). Slug fora da lista → 404. */
export const Route = createFileRoute('/paginas/$slug')({
  loader: ({ context: { queryClient }, params }) => {
    const slug = pageSlugSchema.safeParse(params.slug)
    if (!slug.success) throw notFound()
    void queryClient.ensureQueryData(pageQueryOptions(slug.data)).catch(() => undefined)
    return { slug: slug.data }
  },
  component: PageRoute,
  notFoundComponent: PageNotFound,
})

function PageRoute() {
  const { slug } = Route.useLoaderData()
  return <InstitutionalPage key={slug} slug={slug} />
}
