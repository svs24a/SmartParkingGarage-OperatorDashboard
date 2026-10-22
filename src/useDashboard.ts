import { useEffect, useState } from 'react'
import { getJson } from './api'
import type { GarageSummary, HealthResponse, IntegrationStatus } from './api'

export function useDashboard() {
  const [garage, setGarage] = useState<GarageSummary | null>(null)
  const [integration, setIntegration] = useState<IntegrationStatus | null>(null)
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [garageStale, setGarageStale] = useState(false)
  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    let controller: AbortController
    async function refresh() {
      controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      const started = Date.now()
      // Independent reads; health remains visible if a data endpoint fails.
      const [health, parking, unity] = await Promise.allSettled([
        getJson<HealthResponse>('/health', controller.signal),
        getJson<GarageSummary>('/api/garage', controller.signal),
        getJson<IntegrationStatus>('/api/integration/status', controller.signal),
      ])
      clearTimeout(timeout)
      if (stopped) return
      const failures: string[] = []
      setBackendConnected(health.status === 'fulfilled' && health.value.status === 'ok')
      if (health.status === 'rejected') failures.push('FastAPI health check failed. Check that the backend is running on port 8000.')
      else if (health.value.status !== 'ok') failures.push('FastAPI reported an unhealthy status.')
      if (parking.status === 'fulfilled') {
        setGarage(parking.value)
        setLastRefresh(new Date())
        setGarageStale(false)
      } else {
        setGarageStale(true)
        failures.push('Parking data could not be refreshed. Displayed counts are the last successful response.')
      }
      if (unity.status === 'fulfilled') setIntegration(unity.value)
      else {
        setIntegration(null)
        failures.push('Unity connection status is unavailable.')
      }
      setErrors(failures)
      // Approximately one cycle per second, with no overlapping slow requests.
      timer = setTimeout(refresh, Math.max(0, 1000 - (Date.now() - started)))
    }
    void refresh()
    return () => { stopped = true; clearTimeout(timer); controller?.abort() }
  }, [])
  return { garage, integration, backendConnected, errors, lastRefresh, garageStale }
}
