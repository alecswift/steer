const key = 'steer.session.id'

// One ID per browser tab. sessionStorage keeps it across reloads of the
// same tab; if storage is unavailable, the ID lasts for this page load.
function loadSessionId(): string {
  try {
    const existing = sessionStorage.getItem(key)
    if (existing) return existing
    const id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

export const sessionId = loadSessionId()
