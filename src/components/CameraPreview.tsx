import { useEffect, useState } from 'react'
import type { Camera, CameraMetadata } from '../cctv'

interface Props {
  camera: Camera
  metadata?: CameraMetadata
  loading: boolean
  connectionError: boolean
  imageEpoch: number
}

export function CameraPreview({ camera, metadata, loading, connectionError, imageEpoch }: Props) {
  const frame = metadata?.thumbnail
  const health = metadata?.enabled === false ? 'Unavailable' : frame?.health ?? 'Unavailable'
  const canShow = health === 'Fresh' || health === 'Stale'
  const version = `${frame?.sequence ?? ''}:${frame?.captured_at ?? ''}:${imageEpoch}`
  const [retry, setRetry] = useState(0)
  const src = `/api/cameras/${encodeURIComponent(camera.id)}/frame?kind=thumbnail&v=${encodeURIComponent(version)}&retry=${retry}`
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const imageFailed = failedSrc === src
  useEffect(() => {
    if (!imageFailed || !canShow || connectionError) return
    const timer = setTimeout(() => setRetry(value => value + 1), 1000)
    return () => clearTimeout(timer)
  }, [imageFailed, canShow, connectionError])
  const status = connectionError ? 'Connection failure' : loading ? 'Loading cameras' : imageFailed ? 'Thumbnail unavailable' : health
  const detail = connectionError ? 'Camera service unreachable. Retrying...'
    : imageFailed ? 'Thumbnail request failed. Retrying...'
    : health === 'NoFrame' ? 'Waiting for the first frame'
    : health === 'Unavailable' ? 'Camera unavailable'
    : health === 'Stale' ? 'Last captured thumbnail - stale'
    : loadedSrc !== src ? 'Loading thumbnail...' : 'Live thumbnail'

  return <span className="camera-preview" title={metadata?.description}>
    {canShow && <img
      className="camera-thumbnail"
      src={src}
      alt={`${metadata?.display_name || camera.name} CCTV thumbnail`}
      style={{ visibility: imageFailed ? 'hidden' : 'visible' }}
      onLoad={() => setLoadedSrc(src)}
      onError={() => setFailedSrc(src)}
    />}
    <span className={`camera-status badge ${connectionError || imageFailed || health === 'Stale' ? 'warning' : health === 'Fresh' ? 'good' : 'neutral'}`}>{status}</span>
    <span className="camera-preview-detail">{detail}</span>
  </span>
}
