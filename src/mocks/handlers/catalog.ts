import { http, HttpResponse } from 'msw'
import { CATALOG_PAGE_SIZE, CATALOG_SORTS, CATALOG_TABS, type CatalogSort, type CatalogTab } from '@/entities/catalog'
import { NETWORK_LABELS, networkSchema, type Network, type Nft } from '@/entities/nft'
import { API_BASE_URL } from '@/lib/api'
import { compareWei, parseEth } from '@/lib/money'
import { REVIEWS_PAGE_SIZE } from '@/features/nft/schemas/review'
import { nftsTable } from '../db/catalog'
import { reviewsTable } from '../db/reviews'
import { toSummary } from '../domain/catalog'
import { CATEGORIES, CREATORS } from '../fixtures/categories'
import { notFound } from '../http'
import { withScenario } from '../scenarios'

const NEW_WINDOW_MS = 14 * 86_400_000
const TRENDING_MIN_SCORE = 70

type Filters = {
  q?: string
  categories?: string[]
  networks?: Network[]
  creator?: string
  minWei?: bigint
  maxWei?: bigint
  tab: CatalogTab
}

const normalize = (value: string) =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

function list(params: URLSearchParams, key: string): string[] | undefined {
  const raw = params.get(key)
  const values = raw?.split(',').map((v) => v.trim()).filter(Boolean)
  return values?.length ? values : undefined
}

function parseEthParam(value: string | null): bigint | undefined {
  if (!value) return undefined
  try {
    return parseEth(value)
  } catch {
    return undefined
  }
}

/** Aplica os filtros; `skip` ignora uma dimensão (facets contam com os demais filtros aplicados). */
function matches(nft: Nft, f: Filters, skip?: 'categories' | 'networks' | 'creator', now = Date.now()) {
  if (f.q) {
    const q = normalize(f.q)
    // Sem a coleção: o catálogo inteiro é "Kurio Apes", e "ape" casava os 36 NFTs (reports/BUGS.md, item 7)
    const haystack = normalize(`${nft.name} ${nft.creator} ${nft.tokenId}`)
    if (!haystack.includes(q)) return false
  }
  if (skip !== 'categories' && f.categories && !f.categories.includes(nft.categoryId)) return false
  if (skip !== 'networks' && f.networks && !f.networks.includes(nft.network)) return false
  if (skip !== 'creator' && f.creator && slugify(nft.creator) !== f.creator) return false
  const price = BigInt(nft.priceWei)
  if (f.minWei !== undefined && price < f.minWei) return false
  if (f.maxWei !== undefined && price > f.maxWei) return false
  if (f.tab === 'new' && now - Date.parse(nft.listedAt) > NEW_WINDOW_MS) return false
  if (f.tab === 'trending' && nft.trendingScore < TRENDING_MIN_SCORE) return false
  return true
}

const slugify = (value: string) => normalize(value).replace(/[^a-z0-9]+/g, '-')

function sortNfts(nfts: Nft[], sort: CatalogSort) {
  const byId = (a: Nft, b: Nft) => a.id.localeCompare(b.id)
  return [...nfts].sort((a, b) => {
    switch (sort) {
      case 'price_asc':
        return compareWei(BigInt(a.priceWei), BigInt(b.priceWei)) || byId(a, b)
      case 'price_desc':
        return compareWei(BigInt(b.priceWei), BigInt(a.priceWei)) || byId(a, b)
      case 'popular':
        return b.trendingScore - a.trendingScore || byId(a, b)
      case 'recent':
        return Date.parse(b.listedAt) - Date.parse(a.listedAt) || byId(a, b)
    }
  })
}

const nftNotFound = () => notFound('NFT não encontrado')

export const catalogHandlers = [
  http.get(
    `${API_BASE_URL}/nfts`,
    withScenario('catalog.list', ({ request }) => {
      const params = new URL(request.url).searchParams
      const tabParam = params.get('tab')
      const sortParam = params.get('sort')
      const filters: Filters = {
        q: params.get('q')?.trim() || undefined,
        categories: list(params, 'categories'),
        networks: list(params, 'networks')?.filter((n): n is Network => networkSchema.safeParse(n).success),
        creator: params.get('creator') || undefined,
        minWei: parseEthParam(params.get('minPrice')),
        maxWei: parseEthParam(params.get('maxPrice')),
        tab: CATALOG_TABS.find((t) => t === tabParam) ?? 'all',
      }
      const sort = CATALOG_SORTS.find((s) => s === sortParam) ?? (filters.tab === 'trending' ? 'popular' : 'recent')
      const pageSize = Math.min(Number(params.get('pageSize')) || CATALOG_PAGE_SIZE, 48)
      const page = Math.max(Number(params.get('page')) || 1, 1)

      const all = nftsTable.all()
      const filtered = sortNfts(all.filter((n) => matches(n, filters)), sort)
      const count = (skip: 'categories' | 'networks' | 'creator', predicate: (n: Nft) => boolean) =>
        all.filter((n) => matches(n, filters, skip) && predicate(n)).length

      const prices = all.map((n) => BigInt(n.priceWei))
      const minWei = prices.reduce((a, b) => (b < a ? b : a))
      const maxWei = prices.reduce((a, b) => (b > a ? b : a))

      return HttpResponse.json({
        items: filtered.slice((page - 1) * pageSize, page * pageSize).map(toSummary),
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
        facets: {
          categories: CATEGORIES.map((c) => ({ ...c, count: count('categories', (n) => n.categoryId === c.id) })),
          networks: networkSchema.options.map((id) => ({ id, label: NETWORK_LABELS[id], count: count('networks', (n) => n.network === id) })),
          creators: CREATORS.map((c) => ({ ...c, count: count('creator', (n) => slugify(n.creator) === c.id) })),
          priceRange: { minWei: minWei.toString(), maxWei: maxWei.toString() },
        },
      })
    }),
  ),

  http.get(
    `${API_BASE_URL}/nfts/:id`,
    withScenario('catalog.detail', ({ params }) => {
      const nft = nftsTable.find(String(params.id))
      if (!nft) return nftNotFound()
      return HttpResponse.json(nft)
    }),
  ),

  http.get(
    `${API_BASE_URL}/nfts/:id/related`,
    withScenario('catalog.related', ({ params }) => {
      const nft = nftsTable.find(String(params.id))
      if (!nft) return nftNotFound()
      const related = nftsTable
        .all()
        .filter((n) => n.id !== nft.id && n.collection === nft.collection)
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, 15)
        .map(toSummary)
      return HttpResponse.json(related)
    }),
  ),

  http.get(
    `${API_BASE_URL}/nfts/:id/reviews`,
    withScenario('catalog.reviews', ({ request, params }) => {
      const nft = nftsTable.find(String(params.id))
      if (!nft) return nftNotFound()
      const search = new URL(request.url).searchParams
      const pageSize = Math.min(Math.max(Number(search.get('pageSize')) || REVIEWS_PAGE_SIZE, 1), 50)
      const page = Math.max(Number(search.get('page')) || 1, 1)
      const reviews = [...reviewsTable.forNft(nft)].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id),
      )
      return HttpResponse.json({
        items: reviews.slice((page - 1) * pageSize, page * pageSize),
        page,
        pageSize,
        total: reviews.length,
      })
    }),
  ),
]
