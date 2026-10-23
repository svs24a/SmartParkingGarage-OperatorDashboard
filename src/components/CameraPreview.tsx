// Shared renderer for future feeds once their backend contract is available.
export function CameraPreview() {
  return <span className="camera-preview">
    <span className="camera-placeholder-label">Camera placeholder</span>
    <span>Feed unavailable</span>
    <span className="camera-placeholder-detail">Camera backend not yet implemented</span>
  </span>
}
