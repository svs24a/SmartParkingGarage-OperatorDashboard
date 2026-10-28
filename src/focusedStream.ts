export type FocusedStreamState = 'waiting' | 'streaming' | 'failed'
export type FocusedStreamEvent =
  | { type: 'metadata'; ready: boolean }
  | { type: 'stream-error' }

// Metadata authorizes startup; it does not own an established MJPEG connection.
// A new camera/lease/retry mounts a new session with a fresh waiting state.
export function focusedStreamReducer(state: FocusedStreamState, event: FocusedStreamEvent): FocusedStreamState {
  if (event.type === 'stream-error') return 'failed'
  if (state === 'waiting' && event.ready) return 'streaming'
  return state
}
