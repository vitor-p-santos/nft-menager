import { http, HttpResponse } from 'msw'
import { newsletterSchema } from '@/features/home/schemas/content'
import { pageSlugSchema } from '@/features/pages/schemas/page'
import { API_BASE_URL } from '@/lib/api'
import { nftsTable } from '../db/catalog'
import { loadTable, saveTable } from '../db/storage'
import { HOME_CONTENT, SITE_SETTINGS } from '../fixtures/content'
import { PAGES } from '../fixtures/pages'
import { withScenario } from '../scenarios'
import { toSummary } from './catalog'

export const contentHandlers = [
  http.get(
    `${API_BASE_URL}/content/home`,
    withScenario('content.home', () => {
      const { featuredSlug, ...content } = HOME_CONTENT
      const nft = nftsTable.find(featuredSlug)
      if (!nft) return HttpResponse.json({ code: 'not_found', message: 'Destaque indisponível' }, { status: 404 })
      return HttpResponse.json({
        ...content,
        featured: { title: 'NFT EM DESTAQUE', subtitle: 'OFERTA LIMITADA', nft: toSummary(nft) },
      })
    }),
  ),

  http.get(
    `${API_BASE_URL}/content/site`,
    withScenario('content.site', () => HttpResponse.json(SITE_SETTINGS)),
  ),

  http.get(
    `${API_BASE_URL}/content/pages/:slug`,
    withScenario('content.page', ({ params }) => {
      const slug = pageSlugSchema.safeParse(params.slug)
      if (!slug.success) return HttpResponse.json({ code: 'not_found', message: 'Página não encontrada' }, { status: 404 })
      return HttpResponse.json(PAGES[slug.data])
    }),
  ),

  http.post(
    `${API_BASE_URL}/newsletter`,
    withScenario('content.newsletter', async ({ request }) => {
      const parsed = newsletterSchema.safeParse(await request.json())
      if (!parsed.success) {
        return HttpResponse.json(
          { code: 'validation_error', message: 'E-mail inválido', details: { email: 'Digite um e-mail válido' } },
          { status: 422 },
        )
      }
      const subscribers = loadTable<string[]>('newsletter', () => [])
      const email = parsed.data.email.toLowerCase()
      if (!subscribers.includes(email)) saveTable('newsletter', [...subscribers, email])
      return new HttpResponse(null, { status: 202 })
    }),
  ),
]
