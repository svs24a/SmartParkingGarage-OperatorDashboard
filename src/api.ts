export type DataSource = 'SeededBaseline' | 'UnityLive' | 'UnityLastKnown'
export type Level = 'L1' | 'L2' | 'L3' | 'L4'
// These fields match Backend/app/models/parking.py and integration.py.
export interface LevelSummary {
  level: Level
  total: number
  operational: number
  available: number
  occupied: number
  reserved: number
  out_of_service: number
}
export interface GarageSummary {
  total_physical_spaces: number
  operational_spaces: number
  available: number
  occupied: number
  reserved: number
  out_of_service: number
  levels: LevelSummary[]
  by_space_type: Record<string, number>
  data_source: DataSource
}
export interface IntegrationStatus {
  connected: boolean
  unity_session_id: string | null
  latest_sequence: number
  last_update_at: string | null
  seconds_since_last_update: number | null
  timeout_seconds: number
  data_source: DataSource
  pending_commands: number
  backend_instance_id: string
}
export interface HealthResponse { status: string; service: string; version: string }
export async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, cache: 'no-store' })
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
  return response.json() as Promise<T>
}
