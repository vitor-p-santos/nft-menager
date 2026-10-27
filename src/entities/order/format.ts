/** "29 Jul, 2026" (formato do Figma), com o mês abreviado em português. */
export function formatReceiptDate(iso: string): string {
  const date = new Date(iso)
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '')
  return `${date.getDate()} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${date.getFullYear()}`
}
