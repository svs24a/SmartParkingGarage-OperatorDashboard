import { useEffect, useState } from 'react'
import { getJson } from './api'
import type { CameraMetadata } from './cctv'

export function useCameras() {
  const [metadata, setMetadata] = useState<CameraMetadata[] | null>(null)
  const [error, setError] = useState(false)
  const [metadataRequestedAt, setMetadataRequestedAt] = useState(0)
  const [imageEpoch, setImageEpoch] = useState(() => Date.now())
  useEffect(() => {
    let stopped = false
    let failed = false
    let timer: ReturnType<typeof setTimeout>
    let controller: AbortController | undefined
    async function refresh() {
      const started = Date.now()
      controller = new AbortController()
      const timeout = setTimeout(() => controller?.abort(), 4000)
      try {
        const result = await getJson<CameraMetadata[]>('/api/cameras', controller.signal)
        if (!Array.isArray(result) || result.some(camera =>
          !camera || typeof camera.camera_id !== 'string' || !camera.thumbnail ||
          !['Fresh', 'Stale', 'NoFrame', 'Unavailable'].includes(camera.thumbnail.health))) {
          throw new Error('Invalid camera metadata')
        }
        if (stopped) return
        setMetadata(result)
        setMetadataRequestedAt(started)
        setError(false)
        if (failed) setImageEpoch(value => value + 1)
        failed = false
      } catch {
        if (stopped) return
        failed = true
        setError(true)
      } finally {
        clearTimeout(timeout)
      }
      if (!stopped) timer = setTimeout(refresh, Math.max(0, 1000 - (Date.now() - started)))
    }
    void refresh()
    return () => { stopped = true; clearTimeout(timer); controller?.abort() }
  }, [])
  return { metadata, error, imageEpoch, metadataRequestedAt }
}
