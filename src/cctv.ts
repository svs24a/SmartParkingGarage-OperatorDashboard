// Official Unity IDs supplied from Hayden's CCTV_INTEGRATION.md.
// Keep the official camera inventory independent of backend availability.
export const cameras = [
  { id: 'CAM_GARAGE_EXTERIOR', name: 'Garage exterior' },
  { id: 'CAM_CITY_APPROACH', name: 'City approach' },
  { id: 'CAM_CITY_INTERSECTION', name: 'City intersection' },
  { id: 'CAM_ENTRANCE', name: 'Garage entrance' },
  { id: 'CAM_EXIT', name: 'Garage exit' },
  { id: 'CAM_L1_OVERVIEW', name: 'Level 1 overview' },
  { id: 'CAM_L2_OVERVIEW', name: 'Level 2 overview' },
  { id: 'CAM_L3_OVERVIEW', name: 'Level 3 overview' },
  { id: 'CAM_L4_OVERVIEW', name: 'Level 4 overview' },
  { id: 'CAM_EV_STALLS', name: 'EV charging stalls' },
  { id: 'CAM_RAMP_L1_L2', name: 'Ramp: Level 1 to Level 2' },
  { id: 'CAM_RAMP_L2_L3', name: 'Ramp: Level 2 to Level 3' },
  { id: 'CAM_RAMP_L3_L4', name: 'Ramp: Level 3 to Level 4' },
  { id: 'CAM_TOP_DECK', name: 'Top deck' },
] as const

export type Camera = typeof cameras[number]
export type CameraId = Camera['id']

export type CameraHealth = 'Fresh' | 'Stale' | 'NoFrame' | 'Unavailable'
export interface CameraMetadata {
  camera_id: string
  display_name: string
  enabled: boolean
  allow_focused?: boolean
  description: string
  focused?: CameraMetadata['thumbnail']
  thumbnail: {
    health: CameraHealth
    sequence: number | null
    captured_at: string | null
    age_ms: number | null
    width: number | null
    height: number | null
  }
}
