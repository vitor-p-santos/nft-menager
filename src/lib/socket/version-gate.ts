import type { EventEnvelope } from './events'

const MAX_SEEN_IDS = 500

/**
 * Descarta eventos duplicados (mesmo eventId) e antigos (version <= última aplicada).
 * Um gate por tipo de entidade; resetado ao trocar de conta.
 */
export class VersionGate {
  private readonly versions = new Map<string, number>()
  private readonly seen = new Set<string>()

  accept(event: EventEnvelope): boolean {
    if (this.seen.has(event.eventId)) return false
    this.remember(event.eventId)
    const current = this.versions.get(event.entityId)
    if (current !== undefined && event.version <= current) return false
    this.versions.set(event.entityId, event.version)
    return true
  }

  reset() {
    this.versions.clear()
    this.seen.clear()
  }

  private remember(eventId: string) {
    this.seen.add(eventId)
    if (this.seen.size > MAX_SEEN_IDS) {
      const oldest = this.seen.values().next().value
      if (oldest !== undefined) this.seen.delete(oldest)
    }
  }
}
