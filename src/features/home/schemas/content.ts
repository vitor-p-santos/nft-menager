import { z } from 'zod'
import { imageSchema, nftSummarySchema } from '@/entities/nft'
import { catalogSearchSchema } from '@/entities/catalog'

export const heroSlideSchema = z.object({
  id: z.string(),
  eyebrow: z.string(),
  title: z.string(),
  mobileTitle: z.string(),
  description: z.string(),
  mobileDescription: z.string(),
  ctaLabel: z.string(),
  image: imageSchema,
  secondaryImage: imageSchema,
})

export const promoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  ctaLabel: z.string(),
  image: imageSchema,
  /** Filtro do catálogo aplicado pelo CTA. */
  search: catalogSearchSchema,
})

export const postSchema = z.object({
  id: z.string(),
  publishedAt: z.iso.date(),
  readingMinutes: z.number().int().positive(),
  title: z.string(),
  excerpt: z.string(),
  body: z.array(z.string()).min(1),
  image: imageSchema,
})

export const homeContentSchema = z.object({
  hero: z.array(heroSlideSchema).min(1),
  featured: z.object({ title: z.string(), subtitle: z.string(), nft: nftSummarySchema }),
  promos: z.array(promoSchema),
  posts: z.array(postSchema),
})

export type HeroSlide = z.infer<typeof heroSlideSchema>
export type Promo = z.infer<typeof promoSchema>
export type Post = z.infer<typeof postSchema>
export type HomeContent = z.infer<typeof homeContentSchema>

export const newsletterSchema = z.object({
  email: z.email('Digite um e-mail válido'),
})
export type NewsletterInput = z.infer<typeof newsletterSchema>

export const SOCIAL_NETWORKS = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'] as const

/** Configurações globais do site (contato e redes sociais), usadas pelo footer. */
export const siteSettingsSchema = z.object({
  contact: z.object({
    email: z.email(),
    phone: z.string(),
    /** Valor pronto para `href` (ex.: `tel:+551140028922`). */
    phoneHref: z.string(),
  }),
  socials: z.array(
    z.object({
      id: z.enum(SOCIAL_NETWORKS),
      label: z.string(),
      url: z.url(),
    }),
  ),
})
export type SiteSettings = z.infer<typeof siteSettingsSchema>
