/** "29 Jul, 2026" (formato do Figma), com o mês abreviado em português. */
export function formatReceiptDate(iso: string): string {
  const date = new Date(iso)
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '')
  return `${date.getDate()} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${date.getFullYear()}`
}

/** Total de edições do pedido (soma das quantidades dos itens). */
export function orderEditionsCount(order: { items: ReadonlyArray<{ quantity: number }> }): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}
