
import { useEffect, useRef, useState } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import type { Core, ElementDefinition } from 'cytoscape'
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BrainCircuit,
  CheckCircle2, ChevronRight, CircleDot, Clock3, GitBranch,
  Network, Play, Radio, RefreshCw, Shield, ShieldAlert,
  Siren, Sparkles, Target, Workflow, X
} from 'lucide-react'
import './App.css'

const API = 'http://127.0.0.1:8000'

type Incident = {
  incident?: string
  id?: string
  severity?: string
  alerts?: number
  origin?: string
  reason?: string
  blast_radius?: number
  status?: string
  recommendation?: string
  playbook?: string
  owner?: string
  [key: string]: unknown
}

const initialNodes: ElementDefinition[] = [
  { data: { id: 'currency', label: 'Currency Service', kind: 'suspect' } },
  { data: { id: 'payments', label: 'Payments API', kind: 'service' } },
  { data: { id: 'checkout', label: 'Checkout', kind: 'service' } },
  { data: { id: 'ledger', label: 'Ledger', kind: 'service' } },
  { data: { id: 'gateway', label: 'API Gateway', kind: 'service' } },
  { data: { id: 'alerts', label: 'Alert Cluster', kind: 'alert' } },
  { data: { id: 'database', label: 'Primary DB', kind: 'infra' } },
  { data: { id: 'auth', label: 'Auth Service', kind: 'service' } },
  { data: { id: 'inventory', label: 'Inventory', kind: 'service' } },
  { data: { id: 'queue', label: 'Event Queue', kind: 'infra' } },
  { data: { id: 'worker', label: 'Worker Pool', kind: 'service' } },
]
const initialEdges: ElementDefinition[] = [
  { data: { source: 'currency', target: 'payments' } },
  { data: { source: 'currency', target: 'ledger' } },
  { data: { source: 'payments', target: 'checkout' } },
  { data: { source: 'gateway', target: 'payments' } },
  { data: { source: 'gateway', target: 'auth' } },
  { data: { source: 'checkout', target: 'inventory' } },
  { data: { source: 'ledger', target: 'database' } },
  { data: { source: 'payments', target: 'queue' } },
  { data: { source: 'queue', target: 'worker' } },
  { data: { source: 'alerts', target: 'currency' } },
]

function Metric({ label, value, detail, icon: Icon, tone = 'blue' }: {
  label: string; value: string; detail: string
  icon: typeof Activity; tone?: string
}) {
  return <div className="metric-card">
    <div className={`metric-icon ${tone}`}><Icon size={18} /></div>
    <span className="muted metric-label">{label}</span>
    <strong className="metric-value">{value}</strong>
    <span className="metric-detail">{detail}</span>
  </div>
}

function App() {
  const cyRef = useRef<Core | null>(null)
  const [apiOnline, setApiOnline] = useState(false)
  const [running, setRunning] = useState(false)
  const [tenant, setTenant] = useState('acme')
  const [message, setMessage] = useState('')
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selected, setSelected] = useState<Incident | null>(null)
  const [lastRun, setLastRun] = useState('Waiting for first pipeline run')
  const [apiError, setApiError] = useState('')

  async function checkApi() {
    try {
      const response = await fetch(`${API}/health`)
      if (!response.ok) throw new Error('API health check failed')
      setApiOnline(true)
      setApiError('')
    } catch {
      setApiOnline(false)
      setApiError('API unavailable — start the FastAPI server on port 8000.')
    }
  }

  useEffect(() => {
    void checkApi()
    const timer = window.setInterval(() => void checkApi(), 15000)
    return () => window.clearInterval(timer)
  }, [])

  async function runPipeline() {
    setRunning(true)
    setMessage('')
    try {
      const response = await fetch(`${API}/incidents/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant, use_llm: false }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Pipeline request failed')

      const opened = Array.isArray(data.opened) ? data.opened : [data.opened]
      const analyzed = Array.isArray(data.analyzed) ? data.analyzed : [data.analyzed]
      const responded = Array.isArray(data.responded) ? data.responded : [data.responded]
      const rows = opened.filter(Boolean).map((item: Incident, index: number) => {
        const analysis = analyzed[index] ?? analyzed[0] ?? {}
        const responseData = responded[index] ?? responded[0] ?? {}
        return {
          ...item,
          incident: String(item.incident ?? item.id ?? `Incident ${index + 1}`),
          severity: String(item.severity ?? 'sev1'),
          alerts: Number(item.alerts ?? item.alert_count ?? 0),
          origin: String(analysis.origin ?? analysis.suspect ?? 'Analyzing'),
          reason: String(analysis.reason ?? analysis.explanation ?? 'Analysis completed'),
          blast_radius: Number(analysis.blast_radius ?? analysis.blast ?? 0),
          recommendation: String(responseData.recommendation ?? responseData.action ?? 'Review recommended playbook'),
          playbook: String(responseData.playbook ?? responseData.playbook_name ?? 'Review playbook'),
          owner: String(
  responseData.owner ??
  responseData.on_call ??
  responseData.page ??
  'Unassigned'
),
recommendation: String(
  responseData.update ??
  responseData.recommendation ??
  responseData.action ??
  'Review recommended playbook'
),
          status: 'OPEN',
        }
      })
      setIncidents(previous => [...rows, ...previous].slice(0, 10))
      setSelected(rows[0] ?? null)
      setLastRun(new Date().toLocaleTimeString())
      setMessage(`Pipeline completed successfully for tenant "${tenant}".`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Pipeline failed')
    } finally {
      setRunning(false)
    }
  }

  const graphElements = [...initialNodes, ...initialEdges]

  function layoutGraph(cy: Core) {
    cy.layout({
      name: 'cose',
      animate: true,
      animationDuration: 500,
      fit: true,
      padding: 35,
      nodeRepulsion: () => 6500,
      idealEdgeLength: () => 90,
    }).run()
  }

  function focusSuspect() {
    const origin = String(selected?.origin ?? '').toLowerCase()
    const matched = cyRef.current?.nodes().filter(node =>
      String(node.data('label')).toLowerCase().includes(origin) ||
      String(node.id()).toLowerCase().includes(origin)
    )
    if (matched?.length) {
      cyRef.current?.elements().unselect()
      matched.select()
      cyRef.current?.animate({ center: { eles: matched }, duration: 400, zoom: 1.15 })
    }
  }

  const incidentId = String(selected?.incident ?? selected?.id ?? 'No incident selected')

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Shield size={22} /></div>
        <div><strong>INCIDENT<span>COMMANDER</span></strong><small>CONNECTED INTELLIGENCE</small></div>
      </div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="tenant-select">
        <span className="tenant-dot" />
        <select value={tenant} onChange={event => setTenant(event.target.value)} aria-label="Select tenant">
          <option value="acme">Acme Corporation</option>
          <option value="globex">Globex Systems</option>
        </select>
        <ChevronRight size={15} />
      </div>
      <div className="nav-section">OPERATIONS</div>
      <div className="nav-item active"><Activity size={17} /> Overview <span className="nav-count">{incidents.length}</span></div>
      <div className="nav-item"><Siren size={17} /> Incidents</div>
      <div className="nav-item"><Network size={17} /> Service topology</div>
      <div className="nav-item"><Workflow size={17} /> Agent workflow</div>
      <div className="nav-section">INTELLIGENCE</div>
      <div className="nav-item"><BrainCircuit size={17} /> Graph memory</div>
      <div className="nav-item"><Target size={17} /> Playbook learning</div>
      <div className="sidebar-bottom">
        <div className="system-card">
          <div className="system-card-title"><span className={`status-dot ${apiOnline ? 'online' : ''}`} /> SYSTEM STATUS</div>
          <div className="system-line"><span>FastAPI</span><b>{apiOnline ? 'Connected' : 'Offline'}</b></div>
          <div className="system-line"><span>Graph engine</span><b>FalkorDB</b></div>
          <div className="system-line"><span>Active tenant</span><b>{tenant}</b></div>
        </div>
        <div className="profile"><div className="avatar">IC</div><div><strong>Incident Operator</strong><small>Response console</small></div><CircleDot size={15} /></div>
      </div>
    </aside>

    <main className="main-content">
      <header className="topbar">
        <div className="breadcrumb">Operations <ChevronRight size={14} /> <strong>Overview</strong></div>
        <div className="top-actions">
          <span className={`api-pill ${apiOnline ? 'connected' : ''}`}><span />{apiOnline ? 'API CONNECTED' : 'API OFFLINE'}</span>
          <button className="icon-button" onClick={() => void checkApi()} title="Refresh API status"><RefreshCw size={16} /></button>
          <div className="live-label"><span className="live-dot" /> LIVE CONSOLE</div>
        </div>
      </header>

      <div className="page-content">
        <section className="welcome-row">
          <div><div className="eyebrow"><Sparkles size={14} /> GRAPH-POWERED INCIDENT RESPONSE</div>
            <h1>Incident <span>Overview</span></h1>
            <p>Detect faster. Trace impact. Learn from every resolution.</p>
          </div>
          <button className="run-button" onClick={() => void runPipeline()} disabled={running || !apiOnline}>
            {running ? <RefreshCw size={17} className="spin" /> : <Play size={17} fill="currentColor" />}
            {running ? 'Running agents...' : 'Run agent pipeline'}
          </button>
        </section>

        {apiError && <div className="notice error"><AlertTriangle size={16} />{apiError}</div>}
        {message && <div className={`notice ${message.toLowerCase().includes('failed') || message.toLowerCase().includes('unavailable') ? 'error' : 'success'}`}>
          <span>{message}</span><button onClick={() => setMessage('')}><X size={15} /></button>
        </div>}

        <section className="metrics-grid">
          <Metric label="OPEN INCIDENTS" value={String(incidents.filter(i => i.status === 'OPEN').length)} detail="From this session" icon={ShieldAlert} tone="red" />
          <Metric label="ALERTS CORRELATED" value={String(incidents.reduce((sum, i) => sum + Number(i.alerts ?? 0), 0))} detail="Grouped by graph context" icon={GitBranch} tone="purple" />
          <Metric label="BLAST RADIUS" value={String(selected?.blast_radius ?? '—')} detail="Affected dependency nodes" icon={Network} tone="orange" />
          <Metric label="LAST PIPELINE RUN" value={lastRun === 'Waiting for first pipeline run' ? '—' : lastRun} detail={lastRun} icon={Clock3} tone="green" />
        </section>

        <section className="primary-grid">
          <div className="panel graph-panel">
            <div className="panel-heading">
              <div><div className="panel-title"><Network size={17} /> Service dependency graph</div><div className="panel-subtitle">Connected services · incident context</div></div>
              <button className="subtle-button" onClick={() => cyRef.current && layoutGraph(cyRef.current)}><RefreshCw size={14} /> Re-layout</button>
            </div>
            <div className="graph-legend">
              <span><i className="legend-dot suspect" /> Suspected cause</span>
              <span><i className="legend-dot service" /> Service</span>
              <span><i className="legend-dot alert" /> Alert cluster</span>
            </div>
            <div className="graph-canvas">
              <CytoscapeComponent
                elements={graphElements}
                cy={cy => { cyRef.current = cy; layoutGraph(cy) }}
                stylesheet={[
                  { selector: 'node', style: { 'label': 'data(label)', 'color': '#d9e4f4', 'font-size': 10, 'text-wrap': 'wrap', 'text-max-width': 90, 'text-valign': 'bottom', 'text-margin-y': 9, 'background-color': '#24334b', 'border-width': 1, 'border-color': '#435674', 'width': 28, 'height': 28 } },
                  { selector: 'node[kind = "suspect"]', style: { 'background-color': '#f97368', 'border-color': '#ffb4a9', 'border-width': 3, 'width': 39, 'height': 39, 'color': '#fff1ef' } },
                  { selector: 'node[kind = "alert"]', style: { 'background-color': '#a78bfa', 'border-color': '#c4b5fd', 'shape': 'diamond' } },
                  { selector: 'node[kind = "infra"]', style: { 'background-color': '#247f9c', 'border-color': '#48bfdc', 'shape': 'round-rectangle' } },
                  { selector: 'edge', style: { 'width': 1.4, 'line-color': '#334761', 'target-arrow-color': '#526982', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', 'arrow-scale': 0.7 } },
                  { selector: ':selected', style: { 'border-color': '#fbbf24', 'border-width': 3 } },
                ]}
                style={{ width: '100%', height: '100%' }}
                userZoomingEnabled
                userPanningEnabled
                boxSelectionEnabled={false}
              />
              <div className="graph-hint"><Network size={12} /> Drag nodes · Scroll to zoom</div>
            </div>
            <div className="graph-footer"><span><span className="status-dot online" /> Graph view ready</span><span>{initialNodes.length} nodes · {initialEdges.length} relationships</span></div>
          </div>

          <div className="panel incident-panel">
            <div className="panel-heading">
              <div><div className="panel-title"><AlertTriangle size={17} /> Incident feed</div><div className="panel-subtitle">Latest pipeline results</div></div>
              <span className="feed-count">{incidents.length} RECORDS</span>
            </div>
            {incidents.length === 0 ? <div className="empty-state">
              <div className="empty-icon"><Radio size={22} /></div>
              <strong>No session incidents yet</strong>
              <p>Run the agent pipeline to analyze alerts and generate incident findings.</p>
              <button className="subtle-button" onClick={() => void runPipeline()} disabled={running || !apiOnline}><Play size={14} /> Run pipeline</button>
            </div> : <div className="incident-list">
              {incidents.map((incident, index) => <button className={`incident-row ${selected === incident ? 'selected' : ''}`} key={`${incident.incident}-${index}`} onClick={() => setSelected(incident)}>
                <span className="incident-severity"><AlertTriangle size={16} /></span>
                <span className="incident-info"><strong>{String(incident.incident ?? incident.id)}</strong><small>{String(incident.origin ?? 'Analyzing')} · {Number(incident.alerts ?? 0)} alerts</small></span>
                <span className={`severity-tag ${String(incident.severity).toLowerCase()}`}>{String(incident.severity ?? 'OPEN').toUpperCase()}</span>
              </button>)}
            </div>}
            <div className="incident-footer"><span><span className="live-dot" /> Session feed</span><span>Tenant: {tenant}</span></div>
          </div>
        </section>

        <section className="bottom-grid">
          <div className="panel evidence-panel">
            <div className="panel-heading">
              <div><div className="panel-title"><Target size={17} /> Why this cause?</div><div className="panel-subtitle">Selected incident · explainable evidence</div></div>
              <span className="evidence-badge">EVIDENCE</span>
            </div>
            {selected ? <div className="evidence-content">
              <div className="evidence-incident-id">{incidentId}</div>
              <div className="evidence-main"><div className="evidence-symbol"><GitBranch size={20} /></div><div><span className="muted">SUSPECTED ORIGIN</span><h3>{String(selected.origin ?? 'Not identified')}</h3><p>{String(selected.reason ?? 'No explanation returned by the analyzer.')}</p></div></div>
              <div className="evidence-facts">
                <div><span>Blast radius</span><strong>{String(selected.blast_radius ?? '—')} nodes</strong></div>
                <div><span>Correlated alerts</span><strong>{String(selected.alerts ?? 0)}</strong></div>
                <div><span>Assigned responder</span><strong>{String(selected.owner ?? 'Unassigned')}</strong></div>
              </div>
              <button className="subtle-button" onClick={focusSuspect}><Target size={14} /> Focus suspected origin</button>
            </div> : <div className="empty-state compact"><div className="empty-icon"><Target size={20} /></div><p>Select an incident after running the pipeline to inspect its analysis.</p></div>}
          </div>

          <div className="panel playbook-panel">
            <div className="panel-heading"><div><div className="panel-title"><BrainCircuit size={17} /> Response recommendation</div><div className="panel-subtitle">Responder agent output</div></div><span className="ai-tag"><Sparkles size={12} /> AGENT</span></div>
            {selected ? <>
              <div className="playbook-highlight"><div className="playbook-icon"><Shield size={20} /></div><div><span className="muted">RECOMMENDED PLAYBOOK</span><h3>{String(selected.playbook ?? 'No playbook')}</h3></div><CheckCircle2 size={18} className="playbook-check" /></div>
              <p className="recommendation-text">{String(selected.recommendation ?? 'Review the response recommendation returned by the agent.')}</p>
              <div className="owner-line"><div className="avatar small">IC</div><div><span className="muted">ON-CALL RESPONDER</span><strong>{String(selected.owner ?? 'Unassigned')}</strong></div><ArrowUpRight size={15} /></div>
              <div className="learning-note"><Sparkles size={15} /><span>Learning feedback is recorded through the incident resolution endpoint.</span></div>
            </> : <div className="empty-state compact"><div className="empty-icon"><BrainCircuit size={20} /></div><p>Agent recommendations appear here after the pipeline runs.</p></div>}
          </div>
        </section>

        <footer className="page-footer"><span>INCIDENT COMMANDER <span>·</span> GRAPH-POWERED OPERATIONS</span><span><span className="status-dot online" /> Last refreshed {new Date().toLocaleTimeString()}</span></footer>
      </div>
    </main>
  </div>
}

export default App
