import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Camera, CameraMetadata } from '../cctv'
import { openFocus } from '../focusLease'
import type { FocusState } from '../focusLease'
import { focusedStreamReducer } from '../focusedStream'

interface Props {
  camera: Camera
  metadata?: CameraMetadata
  connectionError: boolean
  metadataRequestedAt: number
  children: ReactNode
}

function MjpegStream({ src, name, onError }: { src: string; name: string; onError: () => void }) {
  const image = useRef<HTMLImageElement>(null)
  useLayoutEffect(() => {
    const element = image.current
    element?.setAttribute('src', src)
    return () => { element?.removeAttribute('src') }
  }, [src])
  // One source owner: polling rerenders never assign src again.
  return <img ref={image} className="camera-focused-stream"
    alt={`${name} focused live feed`} onError={onError} />
}

interface SessionProps extends Props {
  state: FocusState
  streamKey: string
  retry: () => void
}

function FocusedSession({ camera, metadata, connectionError, metadataRequestedAt, children, state, streamKey, retry }: SessionProps) {
  const [stream, dispatch] = useReducer(focusedStreamReducer, 'waiting')
  const lease = state.phase === 'owned' ? state : null
  const supported = metadata?.enabled !== false && metadata?.allow_focused !== false
  // Only a poll started after acquisition can authorize the initial connection.
  const ready = supported && !connectionError && lease !== null &&
    metadataRequestedAt > lease.acquiredAt && metadata?.focused?.health === 'Fresh'
  useEffect(() => { dispatch({ type: 'metadata', ready }) }, [ready])
  const showStream = lease !== null && supported && stream === 'streaming'
  const message = state.phase === 'error' ? state.message
    : !supported ? 'Focused feed is unavailable for this camera.'
    : stream === 'failed' ? 'MJPEG connection failed. Showing thumbnail fallback.'
    : state.phase === 'acquiring' ? 'Acquiring focused view...'
    : connectionError ? showStream
      ? 'Camera metadata unavailable. Keeping the focused connection open; health is unknown.'
      : 'Camera metadata unavailable. Showing thumbnail fallback.'
    : showStream ? metadata?.focused?.health === 'Fresh' ? 'Focused feed active'
      : `Focused health: ${metadata?.focused?.health ?? 'Unknown'}. Keeping the focused connection open; frames may be delayed.`
    : 'Waiting for a fresh focused frame. Showing thumbnail fallback.'
  return <>
    <div className="camera-focus-notice" role="status">
      <span>{message}</span>
      <button className="camera-back" type="button" onClick={retry}>Retry focused view</button>
    </div>
    <div className="camera-focused-view">
      {children}
      {showStream && <MjpegStream
        src={`/api/cameras/${encodeURIComponent(camera.id)}/stream?v=${encodeURIComponent(streamKey)}`}
        name={camera.name}
        onError={() => dispatch({ type: 'stream-error' })}
      />}
    </div>
  </>
}

export function FocusedCamera(props: Props) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<FocusState>({ phase: 'acquiring' })
  useEffect(() => openFocus(props.camera.id, setState), [props.camera.id, attempt])
  const streamKey = state.phase === 'owned'
    ? `${props.camera.id}:${state.lease.lease_id}:${state.lease.focus_generation ?? state.acquiredAt}:${attempt}`
    : `${props.camera.id}:${state.phase}:${attempt}`
  return <FocusedSession key={streamKey} {...props} state={state} streamKey={streamKey}
    retry={() => setAttempt(value => value + 1)} />
}
