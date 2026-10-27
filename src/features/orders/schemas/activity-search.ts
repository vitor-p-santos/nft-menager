import { z } from 'zod'
import { orderStatusSchema } from '@/entities/order'

/**
 * Estado da lista "Atividade" na URL (`/atividade?status=confirmed&page=2`). Como no catálogo, o
 * padrão fica fora da URL e valores inválidos são descartados com `.catch` em vez de quebrar a rota.
 */
export const activitySearchSchema = z.object({
  status: orderStatusSchema.optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
})

export type ActivitySearch = z.infer<typeof activitySearchSchema>
