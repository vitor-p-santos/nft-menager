import type { Nft } from '@/entities/nft'
import type { Review } from '@/features/nft/schemas/review'
import { createRandom } from './random'

const AUTHORS = [
  'Marina Lopes', 'Theo Ramos', 'Ana Ferraz', 'Bruno Castilho', 'Clara Nunes', 'Diego Prado',
  'Elisa Rocha', 'Felipe Barros', 'Gabi Torres', 'Heitor Lima', 'Isadora Melo', 'João Vidal',
  'Luana Pires', 'Mateus Coelho', 'Nina Araújo', 'Otávio Reis', 'Paula Siqueira', 'Rafael Moura',
] as const

const BODIES: Record<number, readonly string[]> = {
  5: [
    'A arte em alta resolução é impressionante, cada detalhe aparece no zoom. Transferência para a carteira foi imediata.',
    'Melhor peça da minha coleção. O acesso exclusivo para colecionadores já valeu a compra.',
    'Procedência verificada na rede e metadados completos. Compra tranquila do início ao fim.',
    'As cores ficam ainda mais bonitas pessoalmente do que na vitrine. Recomendo muito.',
    'Criador atencioso e comunidade ativa. Comprei uma edição e já estou de olho na próxima.',
  ],
  4: [
    'Peça muito bonita e bem finalizada. Só achei a taxa de rede um pouco alta no dia.',
    'Gostei bastante da arte e dos atributos. A entrega na carteira levou alguns minutos.',
    'Ótimo custo-benefício para uma edição limitada. Queria mais conteúdo desbloqueável.',
    'Visual marcante e procedência clara. Faltou só um pouco mais de informação sobre o criador.',
  ],
  3: [
    'A arte é boa, mas esperava mais variação entre as edições da coleção.',
    'Compra funcionou bem, porém o conteúdo desbloqueável ainda não estava disponível.',
  ],
  2: ['Achei o preço alto pelo que entrega. A arte é bonita, mas pouco original.'],
  1: ['Não era o que eu esperava da coleção. O suporte demorou a responder.'],
}

const HOUR = 3_600_000

/** Semente estável derivada do id do NFT (FNV-1a). */
function hash(value: string) {
  let h = 0x811c9dc5
  for (const char of value) h = Math.imul(h ^ char.charCodeAt(0), 0x01000193)
  return h >>> 0
}

/**
 * Notas inteiras cuja média arredonda para `rating`: começa com notas o mais próximas
 * possível da média e troca pares (4,4) → (3,5) para dar variedade sem mudar a soma.
 */
function ratingsFor(rating: number, count: number, random: ReturnType<typeof createRandom>): number[] {
  const sum = Math.min(Math.max(Math.round(rating * count), count), count * 5)
  const base = Math.floor(sum / count)
  const extra = sum - base * count
  const ratings = Array.from({ length: count }, (_, i) => Math.min(base + (i < extra ? 1 : 0), 5))
  for (let i = 0; i + 1 < count; i += 2) {
    if (ratings[i] === 4 && ratings[i + 1] === 4 && random.next() < 0.35) {
      ratings[i] = 3
      ratings[i + 1] = 5
    }
  }
  // Embaralha (Fisher-Yates determinístico)
  for (let i = count - 1; i > 0; i--) {
    const j = random.int(0, i)
    ;[ratings[i], ratings[j]] = [ratings[j] as number, ratings[i] as number]
  }
  return ratings
}

/** Gera `reviewsCount` avaliações por NFT, publicadas depois da listagem e até `now`, mais recentes primeiro. */
export function seedReviews(nft: Nft, now = Date.now()): Review[] {
  const random = createRandom(hash(nft.id))
  const count = nft.reviewsCount
  const listedAt = Date.parse(nft.listedAt)
  const span = Math.max(now - listedAt, HOUR)
  return ratingsFor(nft.rating, count, random).map((rating, index) => ({
    id: `rev-${nft.slug}-${String(index + 1).padStart(3, '0')}`,
    nftId: nft.id,
    author: random.pick(AUTHORS),
    rating,
    body: random.pick(BODIES[rating] ?? BODIES[4] ?? []),
    // index 0 é o mais recente; intervalos regulares entre a listagem e agora
    createdAt: new Date(now - Math.floor(((index + 1) / (count + 1)) * span)).toISOString(),
  }))
}
