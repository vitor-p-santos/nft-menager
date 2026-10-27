import { z } from 'zod'
import { ENS_NAME_PATTERN, normalizeEnsName } from '@/entities/wallet'

/** Texto opcional: '' / null / ausente → `null` (o handler revalida o payload já transformado). */
export const optionalText = (max: number, message = `Use até ${max} caracteres`) =>
  z
    .string()
    .trim()
    .max(max, message)
    .nullable()
    .optional()
    .transform((value) => (value ? value : null))

/** "Nome ENS" com o seletor ".eth" do Figma: opcional; sem o sufixo, ganha ".eth". */
export const optionalEnsNameSchema = optionalText(64)
  .refine((value) => value === null || ENS_NAME_PATTERN.test(value), 'Nome ENS inválido')
  .transform((value) => (value === null ? null : normalizeEnsName(value)))
