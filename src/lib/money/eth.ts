/**
 * Aritmética de ETH em wei (bigint). Nunca usar number/float para valores.
 * A API trafega valores como string decimal de wei (ex.: "1250000000000000000").
 */
export const ETH_DECIMALS = 18
const WEI_PER_ETH = 10n ** BigInt(ETH_DECIMALS)
const BPS_DENOMINATOR = 10_000n

export type Wei = bigint

export function weiFromString(value: string): Wei {
  if (!/^\d+$/.test(value)) throw new Error(`Valor em wei inválido: ${value}`)
  return BigInt(value)
}

export function weiToString(value: Wei): string {
  return value.toString()
}

/** "1.25" → 1250000000000000000n */
export function parseEth(value: string): Wei {
  const match = /^(\d+)(?:\.(\d{1,18}))?$/.exec(value.trim())
  if (!match) throw new Error(`Valor em ETH inválido: ${value}`)
  const [, whole = '0', fraction = ''] = match
  return BigInt(whole) * WEI_PER_ETH + BigInt(fraction.padEnd(ETH_DECIMALS, '0'))
}

/** Formata wei como ETH, sem perda de precisão. Arredonda half-up em `maxDecimals`. */
export function formatEth(value: Wei, maxDecimals = 4): string {
  const negative = value < 0n
  let abs = negative ? -value : value
  const scale = 10n ** BigInt(ETH_DECIMALS - maxDecimals)
  if (maxDecimals < ETH_DECIMALS) {
    abs = ((abs + scale / 2n) / scale) * scale
  }
  const whole = abs / WEI_PER_ETH
  const fraction = (abs % WEI_PER_ETH)
    .toString()
    .padStart(ETH_DECIMALS, '0')
    .slice(0, maxDecimals)
    .replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`
}

export function sumWei(values: readonly Wei[]): Wei {
  return values.reduce((acc, v) => acc + v, 0n)
}

export function multiplyWei(value: Wei, quantity: number): Wei {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error(`Quantidade inválida: ${quantity}`)
  return value * BigInt(quantity)
}

/** Aplica percentual em basis points (1% = 100 bps), arredondando para baixo. */
export function percentOfWei(value: Wei, bps: number): Wei {
  if (!Number.isInteger(bps) || bps < 0) throw new Error(`bps inválido: ${bps}`)
  return (value * BigInt(bps)) / BPS_DENOMINATOR
}

/** Formata para exibição com sufixo, como no Figma: "1.19 ETH". Mínimo de 2 casas. */
export function formatEthLabel(value: Wei | string, maxDecimals = 4): string {
  const wei = typeof value === 'string' ? weiFromString(value) : value
  const [whole, fraction = ''] = formatEth(wei, maxDecimals).split('.')
  return `${whole}.${fraction.padEnd(2, '0')} ETH`
}

export function compareWei(a: Wei, b: Wei): number {
  return a === b ? 0 : a < b ? -1 : 1
}

/*
 * Centésimos de ETH: inteiros seguros em `number`, para controles discretos como o slider da faixa
 * de preço do catálogo (a URL continua guardando ETH em string decimal).
 */
const WEI_PER_CENTI_ETH = 10n ** BigInt(ETH_DECIMALS - 2)

/** Wei → centésimos de ETH, arredondando para baixo (`floor`) ou para cima (`ceil`). */
export function weiToCentiEth(value: Wei, rounding: 'floor' | 'ceil' = 'floor'): number {
  const centi = rounding === 'ceil' ? (value + WEI_PER_CENTI_ETH - 1n) / WEI_PER_CENTI_ETH : value / WEI_PER_CENTI_ETH
  return Number(centi)
}

/** "0.02" (ETH) → 2; `fallback` quando o valor falta ou é inválido. */
export function ethToCentiEth(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  try {
    return weiToCentiEth(parseEth(value))
  } catch {
    return fallback
  }
}

/** 2 → "0.02". `decimalSeparator: ','` para exibição no padrão do Figma ("0,02"). */
export function centiEthToEth(centi: number, decimalSeparator = '.'): string {
  return `${Math.floor(centi / 100)}${decimalSeparator}${String(centi % 100).padStart(2, '0')}`
}
