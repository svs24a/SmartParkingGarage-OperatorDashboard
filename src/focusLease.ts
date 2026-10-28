// Serialize focus operations across switching, retries, and React StrictMode effects.
let operations = Promise.resolve()
function enqueue(operation: () => Promise<void>) {
  operations = operations.then(operation, operation).catch(() => {})
}

export interface FocusLease {
  lease_id: string
  camera_id?: string | null
  focus_generation?: string | null
  expires_at?: string | null
}
export type FocusState =
  | { phase: 'acquiring' }
  | { phase: 'owned'; lease: FocusLease; acquiredAt: number }
  | { phase: 'error'; message: string }

function failure(status: number) {
  if (status === 409) return 'Focused view is owned by another viewer. Retry when it is available.'
  if (status === 503 || status === 404) return 'Focused feed is unavailable. The thumbnail remains available.'
  return `Focus request failed (HTTP ${status}).`
}

export function openFocus(cameraId: string, update: (state: FocusState) => void) {
  let closed = false
  let lease: FocusLease | undefined
  let renewal: ReturnType<typeof setTimeout> | undefined
  let expiration: ReturnType<typeof setTimeout> | undefined
  async function release() {
    if (!lease) return
    const id = lease.lease_id
    lease = undefined
    // Keepalive permits best-effort release during page navigation too.
    try {
      await fetch('/api/cameras/focus', {
        method: 'DELETE', headers: { 'X-Focus-Lease-Id': id },
        keepalive: true, signal: AbortSignal.timeout(4000),
      })
    } catch { /* The server expires leases if release cannot reach it. */ }
  }
  function stop(message: string) {
    clearTimeout(renewal)
    clearTimeout(expiration)
    if (!closed) update({ phase: 'error', message })
    closed = true
    enqueue(release)
  }
  async function request() {
    if (closed) return
    const renewing = Boolean(lease)
    const started = Date.now()
    try {
      const response = await fetch(`/api/cameras/${encodeURIComponent(cameraId)}/focus`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lease ? { lease_id: lease.lease_id } : {}),
        cache: 'no-store', keepalive: true, signal: AbortSignal.timeout(8000),
      })
      if (!response.ok) throw new Error(failure(response.status))
      const result: FocusLease = await response.json()
      if (!result.lease_id || (result.camera_id && result.camera_id !== cameraId)) {
        throw new Error('The backend returned an invalid focus lease.')
      }
      lease = result
      if (closed) { await release(); return }
      if (!renewing) update({ phase: 'owned', lease: result, acquiredAt: Date.now() })
      clearTimeout(expiration)
      if (result.expires_at) {
        const remaining = Date.parse(result.expires_at) - Date.now()
        if (!Number.isFinite(remaining) || remaining <= 0) throw new Error('The focus lease expired. Retry to reconnect.')
        expiration = setTimeout(() => stop('The focus lease expired. Retry to reconnect.'), remaining)
      }
      renewal = setTimeout(() => enqueue(request), Math.max(0, 10000 - (Date.now() - started)))
    } catch (error) {
      stop(error instanceof Error && error.name !== 'TimeoutError' && error.name !== 'TypeError'
        ? error.message : 'Focus connection failed. Check the backend and retry.')
    }
  }
  update({ phase: 'acquiring' })
  enqueue(request)
  const close = () => {
    closed = true
    clearTimeout(renewal)
    clearTimeout(expiration)
    enqueue(release)
  }
  const pagehide = () => {
    closed = true
    clearTimeout(renewal)
    clearTimeout(expiration)
    void release()
  }
  window.addEventListener('pagehide', pagehide)
  return () => {
    window.removeEventListener('pagehide', pagehide)
    close()
  }
}
