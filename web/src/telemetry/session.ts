const key = 'steer.session.id'

function createSessionId(): string {
  try {
    return globalThis.crypto?.randomUUID?.() ?? fallbackSessionId()
  } catch {
    return fallbackSessionId()
  }
}

function fallbackSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

// One ID per browser tab. sessionStorage keeps it across reloads of the
// same tab; if storage is unavailable, the ID lasts for this page load.
function loadSessionId(): string {
  try {
    const existing = sessionStorage.getItem(key)
    if (existing) return existing
    const id = createSessionId()
    sessionStorage.setItem(key, id)
    return id
  } catch {
    return fallbackSessionId()
  }
}

export const sessionId = loadSessionId()
