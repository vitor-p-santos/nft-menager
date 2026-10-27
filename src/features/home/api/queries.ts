import { queryOptions, useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api'
import { homeContentSchema, siteSettingsSchema, type NewsletterInput } from '../schemas/content'

export const homeKeys = {
  content: ['content', 'home'] as const,
  site: ['content', 'site'] as const,
}

export const homeQueries = {
  content: () =>
    queryOptions({
      queryKey: homeKeys.content,
      queryFn: ({ signal }) => api.get('/content/home', homeContentSchema, { signal }),
      staleTime: 5 * 60_000,
    }),
  site: () =>
    queryOptions({
      queryKey: homeKeys.site,
      queryFn: ({ signal }) => api.get('/content/site', siteSettingsSchema, { signal }),
      // Contato e redes mudam raramente: o footer não refaz a busca a cada navegação
      staleTime: 30 * 60_000,
    }),
}

/** Configurações do site (contato e redes sociais) consumidas pelo footer. */
export const siteQueryOptions = homeQueries.site

export function useSubscribeNewsletter() {
  return useMutation({
    mutationFn: (input: NewsletterInput) => api.post('/newsletter', input, z.unknown()),
  })
}
