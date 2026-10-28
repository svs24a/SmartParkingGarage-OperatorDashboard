import { useLayoutEffect, useRef, useState } from 'react'
import { cameras } from '../cctv'
import type { CameraId } from '../cctv'
import { CameraPreview } from './CameraPreview'
import { useCameras } from '../useCameras'
import { FocusedCamera } from './FocusedCamera'

export function CctvMonitor() {
  const { metadata, error, imageEpoch, metadataRequestedAt } = useCameras()
  const preview = (camera: typeof cameras[number]) => <CameraPreview
    camera={camera}
    metadata={metadata?.find(item => item.camera_id === camera.id)}
    loading={metadata === null}
    connectionError={error}
    imageEpoch={imageEpoch}
  />
  const [selectedId, setSelectedId] = useState<CameraId | null>(null)
  const selected = cameras.find(camera => camera.id === selectedId)
  const backButton = useRef<HTMLButtonElement>(null)
  const tileButtons = useRef(new Map<CameraId, HTMLButtonElement>())
  const lastSelectedId = useRef<CameraId | null>(null)

  useLayoutEffect(() => {
    if (selectedId) {
      lastSelectedId.current = selectedId
      backButton.current?.focus()
    } else if (lastSelectedId.current) {
      tileButtons.current.get(lastSelectedId.current)?.focus()
    }
  }, [selectedId])

  return <section aria-labelledby="cctv-title">
    <div className="section-header">
      <h2 id="cctv-title">CCTV Monitoring</h2>
      <span>{cameras.length} cameras · Thumbnails refresh with new frames</span>
    </div>
    <p className="muted cctv-description">Select a camera for a focused live view, with thumbnail fallback. Health is reported by the camera backend.</p>
    {error && <p className="notice error" role="status">Camera connection failed. Last known thumbnails may be out of date. Retrying automatically.</p>}
    {selected ? <div className="camera-individual">
      <div className="camera-view-header">
        <div><h3>{selected.name}</h3><p className="camera-id">{selected.id}</p></div>
        <label className="camera-switch">Camera <select value={selected.id} onChange={event => setSelectedId(event.target.value as CameraId)}>
          {cameras.map(camera => <option key={camera.id} value={camera.id}>{camera.name}</option>)}
        </select></label>
        <button ref={backButton} type="button" className="camera-back" onClick={() => setSelectedId(null)}>Back to all cameras</button>
      </div>
      <FocusedCamera key={selected.id} camera={selected}
        metadata={metadata?.find(camera => camera.camera_id === selected.id)}
        connectionError={error} metadataRequestedAt={metadataRequestedAt}>
        {preview(selected)}
      </FocusedCamera>
    </div> : <div className="camera-grid">
      {cameras.map(camera => <button
        key={camera.id}
        ref={node => {
          if (node) tileButtons.current.set(camera.id, node)
          else tileButtons.current.delete(camera.id)
        }}
        type="button"
        className="camera-tile"
        aria-label={`Enlarge ${camera.name}`}
        onClick={() => setSelectedId(camera.id)}
      >
        {preview(camera)}
        <span className="camera-tile-info">
          <span className="camera-name">{camera.name}</span>
          <span className="camera-id">{camera.id}</span>
          <span className="camera-open">Enlarge view</span>
        </span>
      </button>)}
    </div>}
  </section>
}
