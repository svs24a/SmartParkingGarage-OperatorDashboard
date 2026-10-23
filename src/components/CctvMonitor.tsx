import { useLayoutEffect, useRef, useState } from 'react'
import { cameras } from '../cctv'
import type { CameraId } from '../cctv'
import { CameraPreview } from './CameraPreview'

export function CctvMonitor() {
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
      <span>{cameras.length} cameras · Feeds pending backend integration</span>
    </div>
    <p className="muted cctv-description">Select a camera to enlarge its view. All previews are placeholders until camera feeds become available.</p>
    {selected ? <div className="camera-individual">
      <div className="camera-view-header">
        <div><h3>{selected.name}</h3><p className="camera-id">{selected.id}</p></div>
        <button ref={backButton} type="button" className="camera-back" onClick={() => setSelectedId(null)}>Back to all cameras</button>
      </div>
      <CameraPreview />
    </div> : <div className="camera-grid">
      {cameras.map(camera => <button
        key={camera.id}
        ref={node => {
          if (node) tileButtons.current.set(camera.id, node)
          else tileButtons.current.delete(camera.id)
        }}
        type="button"
        className="camera-tile"
        aria-label={`Enlarge ${camera.name}. Feed unavailable.`}
        onClick={() => setSelectedId(camera.id)}
      >
        <CameraPreview />
        <span className="camera-tile-info">
          <span className="camera-name">{camera.name}</span>
          <span className="camera-id">{camera.id}</span>
          <span className="camera-open">Enlarge view</span>
        </span>
      </button>)}
    </div>}
  </section>
}
