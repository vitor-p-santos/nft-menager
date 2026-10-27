import type { Image, Network, Nft } from '@/entities/nft'
import { parseEth } from '@/lib/money'
import { CATEGORIES, CREATORS } from './categories'
import { createRandom } from './random'

const ART = {
  emerald: '/images/nfts/ape-emerald.png',
  sage: '/images/nfts/ape-sage.png',
  ivory: '/images/nfts/ape-ivory.png',
  golden: '/images/nfts/ape-golden.png',
} as const
type Art = keyof typeof ART

const DAY = 86_400_000

function image(art: Art, name: string): Image {
  return { src: ART[art], alt: `Arte do NFT ${name}`, width: 1254, height: 1254 }
}

type Seed = {
  name: string
  number: string
  art: Art
  price: string
  compareAt?: string
  rare?: boolean
  categoryId: string
  network: Network
  creatorId: string
  daysAgo: number
  trending: number
}

/** NFTs exibidos no Figma (nome, número, arte e preço conforme o design). */
const FIGMA_SEEDS: Seed[] = [
  { name: 'Emerald Ape', number: '042', art: 'emerald', price: '1.19', categoryId: 'arte-digital', network: 'ethereum', creatorId: 'nova-sato', daysAgo: 0, trending: 96 },
  { name: 'Sage Nomad', number: '009', art: 'sage', price: '1.69', categoryId: 'arte-digital', network: 'ethereum', creatorId: 'iris-mendes', daysAgo: 1, trending: 88 },
  { name: 'Neon Vessel', number: '552', art: 'ivory', price: '1.99', compareAt: '2.29', rare: true, categoryId: 'colecionaveis', network: 'polygon', creatorId: 'kai-duarte', daysAgo: 2, trending: 91 },
  { name: 'Cosmic Bloom', number: '118', art: 'sage', price: '1.29', categoryId: 'generativa', network: 'solana', creatorId: 'lia-moraes', daysAgo: 3, trending: 64 },
  { name: 'Violet Nomad', number: '314', art: 'sage', price: '1.39', categoryId: 'arte-digital', network: 'ethereum', creatorId: 'iris-mendes', daysAgo: 4, trending: 72 },
  { name: 'Ivory Baron', number: '088', art: 'ivory', price: '1.79', categoryId: 'arte-3d', network: 'polygon', creatorId: 'kai-duarte', daysAgo: 5, trending: 77 },
  { name: 'Golden Beat', number: '207', art: 'golden', price: '0.99', categoryId: 'musica', network: 'ethereum', creatorId: 'rafa-okoye', daysAgo: 6, trending: 83 },
  { name: 'Golden Frequency', number: '071', art: 'golden', price: '0.59', categoryId: 'musica', network: 'solana', creatorId: 'rafa-okoye', daysAgo: 7, trending: 58 },
  { name: 'Golden Signal', number: '160', art: 'golden', price: '0.39', categoryId: 'musica', network: 'polygon', creatorId: 'rafa-okoye', daysAgo: 8, trending: 69 },
]

const PREFIXES = ['Amber', 'Copper', 'Rust', 'Sable', 'Ochre', 'Umber', 'Cedar', 'Bronze', 'Saffron', 'Dune', 'Ember', 'Moss', 'Onyx', 'Pearl']
const SPECIES = ['Ape', 'Nomad', 'Baron', 'Signal', 'Beat', 'Bloom', 'Vessel', 'Monk', 'Drifter']
const ARTS: Art[] = ['emerald', 'sage', 'ivory', 'golden']
const NETWORKS: Network[] = ['ethereum', 'polygon', 'solana']

function generatedSeeds(count: number): Seed[] {
  const random = createRandom(42)
  const used = new Set(FIGMA_SEEDS.map((s) => `${s.name} #${s.number}`))
  const seeds: Seed[] = []
  while (seeds.length < count) {
    const name = `${random.pick(PREFIXES)} ${random.pick(SPECIES)}`
    const number = String(random.int(1, 999)).padStart(3, '0')
    if (used.has(`${name} #${number}`)) continue
    used.add(`${name} #${number}`)
    // Preços em centésimos de ETH entre 0,02 e 12,30 (limites do slider no Figma)
    const cents = seeds.length === 0 ? 2 : seeds.length === 1 ? 1230 : random.int(2, 1230)
    const price = `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
    const discounted = random.next() < 0.15
    seeds.push({
      name,
      number,
      art: random.pick(ARTS),
      price,
      compareAt: discounted ? `${Math.floor(cents / 100) + 1}.${String(cents % 100).padStart(2, '0')}` : undefined,
      rare: random.next() < 0.12,
      categoryId: random.pick(CATEGORIES).id,
      network: random.pick(NETWORKS),
      creatorId: random.pick(CREATORS).id,
      daysAgo: random.int(9, 60),
      trending: random.int(5, 95),
    })
  }
  return seeds
}

function toNft(seed: Seed, index: number, now: number): Nft {
  const creator = CREATORS.find((c) => c.id === seed.creatorId)?.label ?? seed.creatorId
  const fullName = `${seed.name} #${seed.number}`
  const slug = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')
  const img = image(seed.art, fullName)
  const random = createRandom(1000 + index)
  return {
    id: `nft-${slug}`,
    slug,
    name: fullName,
    tokenId: `#0${seed.number}`,
    collection: 'Kurio Apes',
    creator,
    categoryId: seed.categoryId,
    network: seed.network,
    priceWei: parseEth(seed.price).toString(),
    compareAtPriceWei: seed.compareAt ? parseEth(seed.compareAt).toString() : null,
    rarity: seed.rare ? 'rare' : null,
    image: img,
    images: [img, img, img, img],
    editions: [
      { edition: '1/1', available: random.int(0, 1) },
      { edition: '1/10', available: random.int(0, 10) },
      { edition: '1/50', available: random.int(5, 50) },
      { edition: 'open', available: 999 },
    ],
    rating: Math.round((4 + random.next()) * 10) / 10,
    reviewsCount: random.int(3, 40),
    description: `Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na ${seed.network === 'ethereum' ? 'Ethereum' : seed.network === 'polygon' ? 'Polygon' : 'Solana'}, com arte desbloqueável e acesso para colecionadores.`,
    details: [
      `${fullName} é uma obra digital finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na rede.`,
      `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência. ${creator} recebe 5% de direitos autorais nas vendas secundárias.`,
    ],
    attributes: seed.rare ? ['Óculos', 'Esmeralda', 'Raro'] : ['Óculos', 'Esmeralda'],
    contractAddress: '0x7A42...19E8',
    royaltyBps: 500,
    listedAt: new Date(now - seed.daysAgo * DAY - index * 60_000).toISOString(),
    trendingScore: seed.trending,
    version: 1,
  }
}

/** Gera o catálogo completo: 9 NFTs do Figma + 27 gerados (4 páginas de 9). */
export function seedNfts(now = Date.now()): Nft[] {
  return [...FIGMA_SEEDS, ...generatedSeeds(27)].map((seed, index) => toNft(seed, index, now))
}
