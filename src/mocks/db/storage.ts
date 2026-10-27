/**
 * Persistência do "banco" simulado em localStorage para sobreviver a refresh.
 * Cada tabela é versionada pelo SCHEMA_VERSION: ao mudar o formato dos dados,
 * incremente para descartar dados antigos e recarregar as fixtures.
 */
const PREFIX = 'mockdb:'
const SCHEMA_VERSION = 3

type Stored<T> = { v: number; data: T }

export function loadTable<T>(name: string, seed: () => T): T {
  try {
    const raw = localStorage.getItem(PREFIX + name)
    if (raw) {
      const parsed = JSON.parse(raw) as Stored<T>
      if (parsed.v === SCHEMA_VERSION) return parsed.data
    }
  } catch {
    // dados corrompidos → reseed
  }
  const data = seed()
  saveTable(name, data)
  return data
}

export function saveTable<T>(name: string, data: T) {
  const payload: Stored<T> = { v: SCHEMA_VERSION, data }
  localStorage.setItem(PREFIX + name, JSON.stringify(payload))
}

export function resetDatabase() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(PREFIX)) localStorage.removeItem(key)
  }
}
