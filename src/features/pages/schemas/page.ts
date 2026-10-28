import { z } from 'zod'

/** Slugs das páginas institucionais servidas por `GET /content/pages/:slug` (D-10). */
export const PAGE_SLUGS = [
  'central-de-ajuda',
  'como-comprar',
  'carteira-e-seguranca',
  'politica-do-mercado',
  'denunciar-item',
  'estudio-do-criador',
] as const

export const pageSlugSchema = z.enum(PAGE_SLUGS)
export type PageSlug = z.infer<typeof pageSlugSchema>

export const pageSectionSchema = z.object({
  heading: z.string(),
  paragraphs: z.array(z.string()).min(1),
})

export const pageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  updatedAt: z.iso.date(),
  sections: z.array(pageSectionSchema).min(1),
})

export type Page = z.infer<typeof pageSchema>
