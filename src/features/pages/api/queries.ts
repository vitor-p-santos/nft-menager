import { queryOptions } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { pageSchema, type PageSlug } from '../schemas/page'

export const pageKeys = {
  all: ['content', 'pages'] as const,
  detail: (slug: PageSlug) => [...pageKeys.all, slug] as const,
}

export const pageQueryOptions = (slug: PageSlug) =>
  queryOptions({
    queryKey: pageKeys.detail(slug),
    queryFn: ({ signal }) => api.get(`/content/pages/${encodeURIComponent(slug)}`, pageSchema, { signal }),
    staleTime: 30 * 60_000,
  })
