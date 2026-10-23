import { useDashboard } from './useDashboard'
import type { DataSource, Level } from './api'
import { CctvMonitor } from './components/CctvMonitor'
import './App.css'

const labels: Record<DataSource, string> = {
  SeededBaseline: 'Seeded baseline', UnityLive: 'Live Unity data', UnityLastKnown: 'Last known Unity data',
}
const levels: Level[] = ['L1', 'L2', 'L3', 'L4']
function App() {
  const { garage, integration, backendConnected, errors, lastRefresh, garageStale } = useDashboard()
  const stale = garageStale || garage?.data_source === 'UnityLastKnown' || integration?.data_source === 'UnityLastKnown'
  const live = !stale && garage?.data_source === 'UnityLive' && integration?.connected === true
  const metrics = [
    ['Total spaces', garage?.total_physical_spaces, 'total'],
    ['Available', garage?.available, 'available'],
    ['Occupied', garage?.occupied, 'occupied'],
    ['Reserved', garage?.reserved, 'reserved'],
    ['Out of service', garage?.out_of_service, 'unavailable'],
  ] as const
  return <main className="dashboard">
    <header className="page-header">
      <div><p className="eyebrow">Smart Parking Garage</p><h1>Operator Dashboard</h1><p className="subtitle">Garage availability and simulation connectivity</p></div>
      <span className="read-only">Read-only monitoring</span>
    </header>
    <section className="connection-panel" aria-label="Service connectivity">
      <div><span className="status-label">FastAPI backend</span><span className={`badge ${backendConnected ? 'good' : backendConnected === false ? 'warning' : 'neutral'}`}>{backendConnected === null ? 'Checking…' : backendConnected ? 'Connected' : 'Unavailable'}</span></div>
      <div><span className="status-label">Unity simulation</span><span className={`badge ${integration?.connected ? 'good' : 'neutral'}`}>{!integration ? 'Unknown' : integration.connected ? 'Connected' : 'Disconnected'}</span></div>
      <div><span className="status-label">Parking data</span><span className={`badge ${live ? 'good' : 'warning'}`}>{garage ? `${labels[garage.data_source]}${stale ? ' · Stale' : ''}` : 'Awaiting data'}</span></div>
    </section>
    {errors.length > 0 && <div className="notice error" role="alert">{errors.map(error => <p key={error}>{error}</p>)}</div>}
    {garage?.data_source === 'SeededBaseline' && <p className="notice">These counts are the backend’s seeded inventory. Unity has not reported live parking data.</p>}
    {stale && garage && <p className="notice">Parking data is stale. Counts may no longer reflect the garage’s current state.</p>}
    <section aria-labelledby="overview-title">
      <div className="section-header"><h2 id="overview-title">Garage overview</h2><span>{garage ? `${garage.operational_spaces.toLocaleString()} operational spaces` : 'Waiting for parking data…'}</span></div>
      <div className="metrics">{metrics.map(([label, value, tone]) => <article className={`metric ${tone}`} key={label}><h3>{label}</h3><p className="metric-value">{value?.toLocaleString() ?? '—'}</p></article>)}</div>
    </section>
    <section aria-labelledby="levels-title">
      <div className="section-header"><h2 id="levels-title">Availability by level</h2><span>Available / operational capacity</span></div>
      <div className="level-grid">{levels.map(level => {
        const summary = garage?.levels.find(item => item.level === level)
        return <article className="level-card" key={level}>
          <h3><span className="level-icon" aria-hidden="true">P</span>Level {level.slice(1)}<span className="level-id">{level}</span></h3>
          <p className="level-availability">{summary?.available.toLocaleString() ?? '—'} <span>/ {summary?.operational.toLocaleString() ?? '—'}</span></p>
          <p className="muted">spaces available</p>
          {summary && <progress value={summary.available} max={Math.max(1, summary.operational)} aria-label={`${level} available spaces`} />}
          <dl className="level-details">
            <div><dt>Total</dt><dd>{summary?.total ?? '—'}</dd></div>
            <div><dt>Occupied</dt><dd>{summary?.occupied ?? '—'}</dd></div>
            <div><dt>Reserved</dt><dd>{summary?.reserved ?? '—'}</dd></div>
            <div><dt>Out of service</dt><dd>{summary?.out_of_service ?? '—'}</dd></div>
          </dl>
        </article>
      })}</div>
    </section>
    <CctvMonitor />
    <footer>
      <p>Automatic refresh · approximately every second</p>
      <p>Parking data refreshed: {lastRefresh ? lastRefresh.toLocaleTimeString() : 'Not yet'}</p>
      <p>Last Unity report: {integration?.last_update_at ? new Date(integration.last_update_at).toLocaleTimeString() : 'Not available'}{integration?.seconds_since_last_update != null && ` (${Math.floor(integration.seconds_since_last_update)}s ago)`}</p>
    </footer>
  </main>
}
export default App
