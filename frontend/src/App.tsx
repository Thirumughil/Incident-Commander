import { useState, useEffect, useRef, useMemo } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import type { Core, ElementDefinition } from 'cytoscape'
import {
  ShieldAlert, Activity, CheckCircle2, AlertTriangle, RefreshCw,
  Play, BrainCircuit, Users, Network, Layers, Sparkles, ChevronRight,
  X, ExternalLink, Zap, Info, Check, ZoomIn, ZoomOut, Maximize2
} from 'lucide-react'
import './App.css'

const API_BASE = 'http://127.0.0.1:8000'

export interface IncidentSummary {
  id: string
  title: string
  status: 'open' | 'resolved' | string
  severity: string
  started_at: number
  resolved_at?: number | null
  recommended_playbook?: string | null
  paged?: string | null
  origin?: string | null
}

export interface GraphNode {
  id: string
  tier?: number
  hops?: number
  alerting?: boolean
  severity?: string
}

export interface GraphEdge {
  source: string
  target: string
  kind?: string
  criticality?: string
}

export interface GraphCause {
  change: string
  kind: string
  summary: string
  at: number
}

export interface IncidentGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  origin: string | null
  change: GraphCause | null
}

export interface Finding {
  id: string
  agent: string
  claim: string
  confidence: number
  query: string
  created_at: number
  evidence: Record<string, string[]>
}

export interface Task {
  task: string
  kind: string
  status: string
  created_at: number
  finished_at?: number | null
  agent: string
  handed_to?: string | null
  reason?: string | null
  handed_at?: number | null
}

export interface SimilarIncident {
  incident: string
  title: string
  started_at: number
  overlap: number
  change_caused: number
  score: number
  playbook_id: string
  playbook: string
  minutes: number
}

export interface PlaybookRank {
  playbook_id: string
  name: string
  wins: number
  losses: number
  score: number
  similar_incident?: string | null
  similar_minutes?: number | null
  boost?: number
  final?: number
  recommended?: boolean
}

export interface PagedPerson {
  person: string
  role: string
  team: string
  channel: string
  prior_fixes: number
}

export interface IncidentOutcome {
  playbook_id?: string | null
  playbook?: string | null
  worked?: boolean | null
  minutes?: number | null
  resolver?: string | null
}

export interface IncidentDetail {
  incident: IncidentSummary
  origin: string | null
  alerting: string[]
  alerts: Array<{
    alert: string
    metric: string
    severity: string
    fired_at: number
    service: string
  }>
  graph: IncidentGraph
  findings: Finding[]
  tasks: Task[]
  memory: {
    playbooks: PlaybookRank[]
    similar: SimilarIncident[]
  }
  page: PagedPerson | null
  outcome: IncidentOutcome | null
}

export interface KnowledgeSpof {
  service: string
  tier: number
  people_who_fixed_it: number
}

export interface KnowledgeDependedOn {
  service: string
  score: number
}

export interface KnowledgeChokepoint {
  service: string
  score: number
}

export interface KnowledgeView {
  spof: KnowledgeSpof[]
  depended_on: KnowledgeDependedOn[]
  chokepoints: KnowledgeChokepoint[]
}

export interface ServiceProfile {
  info: {
    service: string
    tier: number
    language: string
    slo_ms: number
    team: string
    channel: string
  }
  neighbors: {
    depends_on: string[]
    dependents: string[]
  }
  experts: Array<{
    person: string
    role: string
    incidents: number
    avg_minutes: number
  }>
  incidents: Array<{
    id: string
    title: string
    status: string
    started_at: number
    role: string
    cause?: string | null
  }>
  on_call: PagedPerson[]
}

const cytoscapeStylesheet = [
  {
    selector: 'node',
    style: {
      'label': 'data(label)',
      'color': '#f8fafc',
      'font-size': '11px',
      'font-family': 'DM Sans, sans-serif',
      'font-weight': 600,
      'text-valign': 'center' as const,
      'text-halign': 'center' as const,
      'background-color': '#1e293b',
      'border-width': 2,
      'border-color': '#475569',
      'width': 64,
      'height': 64,
      'text-wrap': 'wrap' as const,
      'text-max-width': '76px',
    }
  },
  {
    selector: 'node[type = "origin"]',
    style: {
      'background-color': '#991b1b',
      'border-color': '#f87171',
      'border-width': 4,
      'width': 78,
      'height': 78,
      'font-weight': 700,
      'color': '#ffffff',
    }
  },
  {
    selector: 'node[type = "alerting"]',
    style: {
      'background-color': '#c2410c',
      'border-color': '#fb923c',
      'border-width': 3,
      'width': 68,
      'height': 68,
      'color': '#ffffff',
    }
  },
  {
    selector: 'node[type = "change"]',
    style: {
      'shape': 'diamond' as const,
      'background-color': '#6d28d9',
      'border-color': '#c084fc',
      'border-width': 3,
      'width': 72,
      'height': 72,
      'color': '#ffffff',
    }
  },
  {
    selector: 'node.focused',
    style: {
      'border-color': '#38bdf8',
      'border-width': 5,
      'background-color': '#0284c7',
    }
  },
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier' as const,
      'target-arrow-shape': 'triangle' as const,
      'target-arrow-color': '#64748b',
      'line-color': '#334155',
      'width': 2,
      'opacity': 0.8,
      'arrow-scale': 1.1,
    }
  },
  {
    selector: 'edge.highlighted',
    style: {
      'line-color': '#f59e0b',
      'target-arrow-color': '#f59e0b',
      'width': 4,
      'opacity': 1.0,
      'z-index': 99,
    }
  },
  {
    selector: 'edge[type = "change-edge"]',
    style: {
      'line-style': 'dashed' as const,
      'line-color': '#a855f7',
      'target-arrow-color': '#a855f7',
      'width': 2,
    }
  }
]

export default function App() {
  const [tenant, setTenant] = useState<string>('acme')
  const [tenants, setTenants] = useState<string[]>(['acme', 'globex'])
  const [apiOnline, setApiOnline] = useState<boolean>(false)
  const [activeNav, setActiveNav] = useState<'operations' | 'knowledge'>('operations')

  // Incidents
  const [incidents, setIncidents] = useState<IncidentSummary[]>([])
  const [feedFilter, setFeedFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)
  const [incidentDetail, setIncidentDetail] = useState<IncidentDetail | null>(null)
  const [detailTab, setDetailTab] = useState<'graph' | 'why' | 'coordination' | 'memory'>('graph')

  // Operations controls
  const [injecting, setInjecting] = useState<boolean>(false)
  const [running, setRunning] = useState<boolean>(false)
  const [resolving, setResolving] = useState<boolean>(false)
  const [notice, setNotice] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null)

  // Resolve form state
  const [resolvePlaybook, setResolvePlaybook] = useState<string>('')
  const [resolveWorked, setResolveWorked] = useState<boolean>(true)
  const [resolveMinutes, setResolveMinutes] = useState<number>(15)
  const [resolvePerson, setResolvePerson] = useState<string>('')
  const [learningResult, setLearningResult] = useState<{
    playbook: string
    worked: boolean
    before: number
    after: number
  } | null>(null)

  // Knowledge view (Track 3)
  const [knowledge, setKnowledge] = useState<KnowledgeView | null>(null)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [serviceProfile, setServiceProfile] = useState<ServiceProfile | null>(null)
  const [loadingService, setLoadingService] = useState<boolean>(false)

  const cyRef = useRef<Core | null>(null)

  // Check health and list tenants
  useEffect(() => {
    async function init() {
      try {
        const healthRes = await fetch(`${API_BASE}/health`)
        if (healthRes.ok) {
          setApiOnline(true)
        } else {
          setApiOnline(false)
        }

        const tenantsRes = await fetch(`${API_BASE}/tenants`)
        if (tenantsRes.ok) {
          const data = await tenantsRes.json()
          if (Array.isArray(data.tenants) && data.tenants.length > 0) {
            setTenants(data.tenants)
          }
        }
      } catch {
        setApiOnline(false)
      }
    }
    void init()
    const interval = setInterval(() => { void init() }, 15000)
    return () => clearInterval(interval)
  }, [])

  // Load incidents when tenant changes
  useEffect(() => {
    async function loadIncidents() {
      try {
        const res = await fetch(`${API_BASE}/incidents?tenant=${encodeURIComponent(tenant)}`)
        if (res.ok) {
          const data = await res.json()
          const rows: IncidentSummary[] = data.incidents || []
          setIncidents(rows)
          if (rows.length > 0) {
            // Pick the first open incident or the newest one
            const firstOpen = rows.find(i => String(i.status).toLowerCase() === 'open')
            setSelectedIncidentId(firstOpen ? firstOpen.id : rows[0].id)
          } else {
            setSelectedIncidentId(null)
            setIncidentDetail(null)
          }
        } else {
          const errData = await res.json().catch(() => ({}))
          setNotice({ type: 'error', message: errData.detail || 'Failed to load incidents.' })
        }
      } catch (err) {
        setNotice({ type: 'error', message: `Cannot connect to API: ${err instanceof Error ? err.message : String(err)}` })
      }
    }
    void loadIncidents()
    setLearningResult(null)
  }, [tenant])

  // Load single incident detail
  useEffect(() => {
    if (!selectedIncidentId) {
      setIncidentDetail(null)
      return
    }

    async function loadDetail() {
      try {
        const res = await fetch(`${API_BASE}/incidents/${encodeURIComponent(selectedIncidentId!)}?tenant=${encodeURIComponent(tenant)}`)
        if (res.ok) {
          const data: IncidentDetail = await res.json()
          setIncidentDetail(data)
          // Pre-populate resolve form
          const recommendedPb = data.incident.recommended_playbook || data.memory.playbooks[0]?.playbook_id || ''
          setResolvePlaybook(recommendedPb)
          setResolvePerson(data.page?.person || data.incident.paged || 'Priya Raman')
          setResolveMinutes(15)
          setResolveWorked(true)
        } else {
          const errData = await res.json().catch(() => ({}))
          setNotice({ type: 'error', message: errData.detail || 'Failed to load incident detail.' })
        }
      } catch (err) {
        setNotice({ type: 'error', message: `Failed to load incident detail: ${err instanceof Error ? err.message : String(err)}` })
      }
    }
    void loadDetail()
  }, [selectedIncidentId, tenant])

  // Load Company Brain knowledge
  useEffect(() => {
    if (activeNav !== 'knowledge') return

    async function loadKnowledge() {
      try {
        const res = await fetch(`${API_BASE}/knowledge?tenant=${encodeURIComponent(tenant)}`)
        if (res.ok) {
          const data: KnowledgeView = await res.json()
          setKnowledge(data)
        } else {
          const errData = await res.json().catch(() => ({}))
          setNotice({ type: 'error', message: errData.detail || 'Failed to load knowledge graph metrics.' })
        }
      } catch (err) {
        setNotice({ type: 'error', message: `Failed to load knowledge view: ${err instanceof Error ? err.message : String(err)}` })
      }
    }
    void loadKnowledge()
  }, [activeNav, tenant])

  // Load Service Profile drawer
  useEffect(() => {
    if (!selectedService) {
      setServiceProfile(null)
      return
    }

    async function loadService() {
      setLoadingService(true)
      try {
        const res = await fetch(`${API_BASE}/services/${encodeURIComponent(selectedService!)}?tenant=${encodeURIComponent(tenant)}`)
        if (res.ok) {
          const data: ServiceProfile = await res.json()
          setServiceProfile(data)
        } else {
          const errData = await res.json().catch(() => ({}))
          setNotice({ type: 'error', message: errData.detail || `Failed to load profile for ${selectedService}` })
        }
      } catch (err) {
        setNotice({ type: 'error', message: `Service profile error: ${err instanceof Error ? err.message : String(err)}` })
      } finally {
        setLoadingService(false)
      }
    }
    void loadService()
  }, [selectedService, tenant])

  // Inject incident scenario
  async function handleInject() {
    setInjecting(true)
    setNotice(null)
    try {
      const res = await fetch(`${API_BASE}/demo/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant, origin: 'currency' })
      })
      const data = await res.json()
      if (res.ok) {
        setNotice({
          type: 'success',
          message: `Injected synthetic failure scenario: Change ${data.change} on ${data.origin} and 4 fired alerts. Click "Run Agents" to trigger detection.`
        })
      } else {
        setNotice({ type: 'error', message: data.detail || 'Injection failed.' })
      }
    } catch (err) {
      setNotice({ type: 'error', message: `Injection failed: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setInjecting(false)
    }
  }

  // Run Agent pipeline
  async function handleRunPipeline() {
    setRunning(true)
    setNotice(null)
    try {
      const res = await fetch(`${API_BASE}/incidents/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant, use_llm: false })
      })
      const data = await res.json()
      if (res.ok) {
        if (data.opened_count === 0) {
          setNotice({
            type: 'info',
            message: 'No open alerts to group. Injected scenario alerts have already been processed into an incident. Click "Inject Demo Incident" to simulate a new incident.'
          })
        } else {
          const newlyOpened = data.opened[0]?.incident
          setNotice({
            type: 'success',
            message: `Agent pipeline finished: Opened and analyzed incident ${newlyOpened} across Detector, Analyzer, and Responder.`
          })
          // Reload incidents
          const listRes = await fetch(`${API_BASE}/incidents?tenant=${encodeURIComponent(tenant)}`)
          if (listRes.ok) {
            const listData = await listRes.json()
            setIncidents(listData.incidents || [])
            if (newlyOpened) {
              setSelectedIncidentId(newlyOpened)
            }
          }
        }
      } else {
        setNotice({ type: 'error', message: data.detail || 'Pipeline run failed.' })
      }
    } catch (err) {
      setNotice({ type: 'error', message: `Pipeline execution failed: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setRunning(false)
    }
  }

  // Resolve incident
  async function handleResolve(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedIncidentId || !incidentDetail) return

    setResolving(true)
    setNotice(null)
    setLearningResult(null)
    try {
      const res = await fetch(`${API_BASE}/incidents/${encodeURIComponent(selectedIncidentId)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant,
          playbook: resolvePlaybook || undefined,
          worked: resolveWorked,
          minutes: Number(resolveMinutes),
          person: resolvePerson || undefined
        })
      })
      const data = await res.json()
      if (res.ok) {
        setLearningResult({
          playbook: data.playbook,
          worked: data.worked,
          before: data.before,
          after: data.after
        })
        setNotice({
          type: 'success',
          message: `Closed-loop learning recorded for ${selectedIncidentId}: ${data.playbook} score moved from ${data.before.toFixed(3)} to ${data.after.toFixed(3)}.`
        })
        // Refresh detail and feed
        const [detailRes, listRes] = await Promise.all([
          fetch(`${API_BASE}/incidents/${encodeURIComponent(selectedIncidentId)}?tenant=${encodeURIComponent(tenant)}`),
          fetch(`${API_BASE}/incidents?tenant=${encodeURIComponent(tenant)}`)
        ])
        if (detailRes.ok) {
          const updatedDetail: IncidentDetail = await detailRes.json()
          setIncidentDetail(updatedDetail)
        }
        if (listRes.ok) {
          const updatedList = await listRes.json()
          setIncidents(updatedList.incidents || [])
        }
      } else {
        setNotice({ type: 'error', message: data.detail || 'Incident resolution failed.' })
      }
    } catch (err) {
      setNotice({ type: 'error', message: `Resolution failed: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setResolving(false)
    }
  }

  // Cytoscape Elements builder
  const graphElements = useMemo<ElementDefinition[]>(() => {
    if (!incidentDetail || !incidentDetail.graph) return []
    const g = incidentDetail.graph
    const elements: ElementDefinition[] = []

    // Service Nodes
    for (const node of g.nodes) {
      const isOrigin = node.id === g.origin
      const isAlerting = !!node.alerting
      let label = node.id
      let nodeType = 'service'
      if (isOrigin) {
        label = `${node.id}\n[ORIGIN]`
        nodeType = 'origin'
      } else if (isAlerting) {
        label = `${node.id}\n(!)`
        nodeType = 'alerting'
      }

      elements.push({
        data: {
          id: node.id,
          label,
          type: nodeType,
          tier: node.tier,
          hops: node.hops,
          alerting: isAlerting,
          severity: node.severity
        }
      })
    }

    // Suspect Change node if exists
    if (g.change) {
      elements.push({
        data: {
          id: g.change.change,
          label: `${g.change.change}\n(${g.change.kind})`,
          type: 'change',
          summary: g.change.summary
        }
      })
      if (g.origin) {
        elements.push({
          data: {
            id: `edge-${g.change.change}-${g.origin}`,
            source: g.change.change,
            target: g.origin,
            type: 'change-edge',
            label: 'TRIGGERED'
          }
        })
      }
    }

    // Subgraph Edges
    for (const edge of g.edges) {
      elements.push({
        data: {
          id: `${edge.source}->${edge.target}`,
          source: edge.source,
          target: edge.target,
          kind: edge.kind,
          criticality: edge.criticality
        }
      })
    }

    return elements
  }, [incidentDetail])

  // Focus a node on graph from an evidence tag click
  function handleFocusNode(nodeId: string) {
    setDetailTab('graph')
    setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.elements().removeClass('focused highlighted')
        const target = cyRef.current.$(`#${nodeId}`)
        if (target.length > 0) {
          target.addClass('focused')
          cyRef.current.animate({
            center: { eles: target },
            zoom: 1.5,
            duration: 400
          })
        }
      }
    }, 100)
  }

  // Highlight explain path from alerting services to origin
  function handleHighlightExplainPath() {
    if (!cyRef.current || !incidentDetail || !incidentDetail.origin) return
    cyRef.current.elements().removeClass('highlighted')

    const originNode = cyRef.current.$(`#${incidentDetail.origin}`)
    if (originNode.length === 0) return

    for (const alertingSvc of incidentDetail.alerting) {
      const alertNode = cyRef.current.$(`#${alertingSvc}`)
      if (alertNode.length > 0) {
        const aStar = cyRef.current.elements().aStar({
          root: alertNode,
          goal: originNode,
          directed: true
        })
        if (aStar.found) {
          aStar.path.addClass('highlighted')
        }
      }
    }
  }

  // Filter incidents for feed
  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => {
      if (feedFilter === 'open') return String(i.status).toLowerCase() === 'open'
      if (feedFilter === 'resolved') return String(i.status).toLowerCase() === 'resolved'
      return true
    })
  }, [incidents, feedFilter])

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <ShieldAlert size={22} />
          </div>
          <div className="brand-text">
            <strong>Incident<span>Commander</span></strong>
            <small>FalkorDB Context Brain</small>
          </div>
        </div>

        <div className="sidebar-section-title">Tenant Graph Workspace</div>
        <div className="tenant-selector">
          <div className="tenant-dot" />
          <select value={tenant} onChange={e => setTenant(e.target.value)}>
            {tenants.map(t => (
              <option key={t} value={t}>tenant_{t}</option>
            ))}
          </select>
        </div>

        <div className="sidebar-section-title">Modules</div>
        <nav className="nav-menu">
          <button
            type="button"
            className={`nav-tab-btn ${activeNav === 'operations' ? 'active' : ''}`}
            onClick={() => setActiveNav('operations')}
          >
            <Activity size={16} />
            <span>Incident Operations</span>
            <span className="nav-badge">{incidents.length}</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeNav === 'knowledge' ? 'active' : ''}`}
            onClick={() => setActiveNav('knowledge')}
          >
            <BrainCircuit size={16} />
            <span>Company Brain (Track 3)</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="synthetic-banner-card">
            <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>Synthetic Demo Data</strong>
              <p style={{ marginTop: 2 }}>All graph entities, topology and feedback outcomes are synthetically generated.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="main-wrapper">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-breadcrumbs">
            <span>Workspace:</span>
            <strong>tenant_{tenant}</strong>
            <ChevronRight size={14} />
            <span>{activeNav === 'operations' ? 'Incident Operations' : 'Company Brain Graph'}</span>
          </div>

          <div className="topbar-actions">
            <div className={`api-status-badge ${apiOnline ? 'online' : 'offline'}`}>
              <div className="api-pulse" />
              <span>{apiOnline ? 'FalkorDB API Online' : 'API Disconnected'}</span>
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setNotice(null)
                setSelectedIncidentId(selectedIncidentId)
              }}
              title="Refresh Current View"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="content-body">
          {/* Notification Alert Banner */}
          {notice && (
            <div className={`notice-box ${notice.type}`}>
              <span>{notice.message}</span>
              <button type="button" onClick={() => setNotice(null)}><X size={14} /></button>
            </div>
          )}

          {activeNav === 'operations' ? (
            <div>
              {/* Controls Toolbar */}
              <div className="controls-card">
                <div className="controls-left">
                  <h2>Multi-Agent Incident Response</h2>
                  <p>Autonomous Detector, Analyzer, Responder, and Learner coordinating purely through FalkorDB graph memory.</p>
                </div>
                <div className="controls-buttons">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleInject}
                    disabled={injecting || running}
                  >
                    <Zap size={15} />
                    <span>{injecting ? 'Injecting...' : 'Inject Demo Incident'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleRunPipeline}
                    disabled={running || injecting}
                  >
                    <Play size={15} />
                    <span>{running ? 'Running Agents...' : 'Run Agent Pipeline'}</span>
                  </button>
                </div>
              </div>

              {/* Grid: Incident Feed (Left) & Detail (Right) */}
              <div className="operations-grid">
                {/* Incident Feed */}
                <div className="incident-feed-col">
                  <div className="feed-header">
                    <h3>Incidents</h3>
                    <div className="feed-tabs">
                      <button
                        type="button"
                        className={`feed-tab-btn ${feedFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setFeedFilter('all')}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        className={`feed-tab-btn ${feedFilter === 'open' ? 'active' : ''}`}
                        onClick={() => setFeedFilter('open')}
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        className={`feed-tab-btn ${feedFilter === 'resolved' ? 'active' : ''}`}
                        onClick={() => setFeedFilter('resolved')}
                      >
                        Resolved
                      </button>
                    </div>
                  </div>

                  <div className="feed-list">
                    {filteredIncidents.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                        No {feedFilter !== 'all' ? feedFilter : ''} incidents found in tenant_{tenant}.
                      </div>
                    ) : (
                      filteredIncidents.map(inc => {
                        const isSelected = inc.id === selectedIncidentId
                        const isOpen = String(inc.status).toLowerCase() === 'open'
                        return (
                          <div
                            key={inc.id}
                            className={`incident-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedIncidentId(inc.id)
                              setLearningResult(null)
                            }}
                          >
                            <div className="card-top">
                              <span className="incident-id-tag">{inc.id}</span>
                              <div className="card-badges">
                                <span className={`badge ${inc.severity === 'sev1' ? 'badge-sev1' : (inc.severity === 'sev2' ? 'badge-sev2' : 'badge-sev3')}`}>
                                  {inc.severity}
                                </span>
                                <span className={`badge ${isOpen ? 'badge-open' : 'badge-resolved'}`}>
                                  {inc.status}
                                </span>
                              </div>
                            </div>
                            <h4>{inc.title}</h4>
                            <div className="card-footer">
                              <div className="origin-badge">
                                <Layers size={12} />
                                <span>{inc.origin || 'Analyzing'}</span>
                              </div>
                              <span>{new Date(inc.started_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Incident Detail */}
                <div className="incident-detail-col">
                  {incidentDetail ? (
                    <>
                      {/* Detail Header Card */}
                      <div className="detail-header-card">
                        <div className="detail-header-top">
                          <div className="header-badges">
                            <span className="incident-id-tag" style={{ fontSize: 13 }}>{incidentDetail.incident.id}</span>
                            <span className={`badge ${incidentDetail.incident.severity === 'sev1' ? 'badge-sev1' : 'badge-sev2'}`}>
                              {incidentDetail.incident.severity}
                            </span>
                            <span className={`badge ${String(incidentDetail.incident.status).toLowerCase() === 'open' ? 'badge-open' : 'badge-resolved'}`}>
                              {incidentDetail.incident.status}
                            </span>
                          </div>
                          {incidentDetail.origin && (
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => setSelectedService(incidentDetail.origin)}
                              title="Open Service Profile Drawer"
                            >
                              <ExternalLink size={12} />
                              <span>Inspect {incidentDetail.origin}</span>
                            </button>
                          )}
                        </div>

                        <h3 className="detail-title">{incidentDetail.incident.title}</h3>

                        <div className="quick-stats-row">
                          <div className="stat-item">
                            <div className="stat-icon red"><AlertTriangle size={18} /></div>
                            <div className="stat-info">
                              <span>Alerts & Impact</span>
                              <strong>{incidentDetail.alerting.length} alerting services</strong>
                            </div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-icon amber"><Layers size={18} /></div>
                            <div className="stat-info">
                              <span>Origin Service</span>
                              <strong>{incidentDetail.origin || 'Under investigation'}</strong>
                            </div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-icon blue"><Sparkles size={18} /></div>
                            <div className="stat-info">
                              <span>Recommended Fix</span>
                              <strong>{incidentDetail.incident.recommended_playbook || 'None'}</strong>
                            </div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-icon purple"><Users size={18} /></div>
                            <div className="stat-info">
                              <span>Paged Responder</span>
                              <strong>{incidentDetail.page?.person || 'Unassigned'}</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detail Sub Tabs */}
                      <div className="detail-tabs-bar">
                        <button
                          type="button"
                          className={`detail-tab-btn ${detailTab === 'graph' ? 'active' : ''}`}
                          onClick={() => setDetailTab('graph')}
                        >
                          <Network size={15} />
                          <span>Incident Graph</span>
                        </button>
                        <button
                          type="button"
                          className={`detail-tab-btn ${detailTab === 'why' ? 'active' : ''}`}
                          onClick={() => setDetailTab('why')}
                        >
                          <BrainCircuit size={15} />
                          <span>"Why?" Evidence Panel</span>
                        </button>
                        <button
                          type="button"
                          className={`detail-tab-btn ${detailTab === 'coordination' ? 'active' : ''}`}
                          onClick={() => setDetailTab('coordination')}
                        >
                          <Activity size={15} />
                          <span>Agent Coordination Tasks</span>
                        </button>
                        <button
                          type="button"
                          className={`detail-tab-btn ${detailTab === 'memory' ? 'active' : ''}`}
                          onClick={() => setDetailTab('memory')}
                        >
                          <Layers size={15} />
                          <span>Memory & Response</span>
                        </button>
                      </div>

                      {/* Tab Content Panels */}
                      <div className="tab-panel-container">
                        {/* 1. CYTOSCAPE GRAPH VIEW */}
                        {detailTab === 'graph' && (
                          <div className="cytoscape-wrapper">
                            <div className="graph-overlay-controls">
                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={handleHighlightExplainPath}
                                title="Trace Dependency Path from Alerts to Origin"
                              >
                                <Zap size={13} color="#f59e0b" />
                                <span>Highlight Explain Path</span>
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => {
                                  cyRef.current?.elements().removeClass('focused highlighted')
                                  cyRef.current?.fit()
                                  cyRef.current?.center()
                                }}
                                title="Reset Graph Layout"
                              >
                                <Maximize2 size={13} />
                                <span>Fit</span>
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => cyRef.current?.zoom((cyRef.current.zoom() || 1) * 1.25)}
                                title="Zoom In"
                              >
                                <ZoomIn size={13} />
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => cyRef.current?.zoom((cyRef.current.zoom() || 1) * 0.8)}
                                title="Zoom Out"
                              >
                                <ZoomOut size={13} />
                              </button>
                            </div>

                            <div className="graph-overlay-legend">
                              <div className="legend-item">
                                <div className="legend-color origin" />
                                <span>Origin</span>
                              </div>
                              <div className="legend-item">
                                <div className="legend-color alerting" />
                                <span>Alerting Service</span>
                              </div>
                              <div className="legend-item">
                                <div className="legend-color blast" />
                                <span>Blast Radius</span>
                              </div>
                              <div className="legend-item">
                                <div className="legend-color change" />
                                <span>Suspect Change</span>
                              </div>
                              <div className="legend-item">
                                <div className="legend-color path" />
                                <span>Explain Path</span>
                              </div>
                            </div>

                            <CytoscapeComponent
                              elements={graphElements}
                              style={{ width: '100%', height: '100%' }}
                              stylesheet={cytoscapeStylesheet}
                              layout={{
                                name: 'cose',
                                animate: false,
                                fit: true,
                                padding: 35,
                                componentSpacing: 60,
                                nodeRepulsion: () => 400000,
                                idealEdgeLength: () => 100,
                              }}
                              cy={cy => {
                                cyRef.current = cy
                                cy.on('tap', 'node', evt => {
                                  const node = evt.target
                                  const nodeId = node.id()
                                  if (node.data('type') === 'service' || node.data('type') === 'origin' || node.data('type') === 'alerting') {
                                    setSelectedService(nodeId)
                                  }
                                })
                              }}
                            />
                          </div>
                        )}

                        {/* 2. WHY EVIDENCE PANEL */}
                        {detailTab === 'why' && (
                          <div className="findings-container">
                            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                              Every decision emitted by an agent records an immutable <strong style={{ color: '#fff' }}>Finding</strong> with <strong style={{ color: '#38bdf8' }}>EVIDENCE</strong> edges pointing to real nodes in FalkorDB. Click any evidence tag below to highlight and focus it on the topology graph.
                            </div>
                            {incidentDetail.findings.map(finding => (
                              <div key={finding.id} className="finding-card">
                                <div className="finding-header">
                                  <div className="finding-agent-badge">
                                    <BrainCircuit size={13} />
                                    <span>{finding.agent}</span>
                                  </div>
                                  <span className="finding-confidence">Confidence: {(finding.confidence * 100).toFixed(0)}%</span>
                                </div>
                                <div className="finding-claim">{finding.claim}</div>
                                <div className="finding-query">
                                  <Sparkles size={12} color="#f59e0b" />
                                  <span>Cypher: {finding.query}</span>
                                </div>
                                <div className="evidence-tags-row">
                                  <span className="evidence-group-label">Evidence nodes:</span>
                                  {Object.entries(finding.evidence).map(([label, keys]) => (
                                    <div key={label} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                      {keys.map(k => (
                                        <button
                                          key={k}
                                          type="button"
                                          className="evidence-pill"
                                          onClick={() => handleFocusNode(k)}
                                          title={`Focus ${label} ${k} on Graph`}
                                        >
                                          {label}: {k}
                                        </button>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 3. AGENT COORDINATION TASKS */}
                        {detailTab === 'coordination' && (
                          <div>
                            <div className="coordination-explainer">
                              <strong>Immutable Graph-Based Coordination:</strong> Agents never call each other through direct RPCs. Coordination happens exclusively through Task nodes and hand-offs in FalkorDB. When Analyzer identifies the origin, it handoffs its task to Responder, passing context via the graph.
                            </div>

                            <div className="tasks-timeline">
                              {incidentDetail.tasks.map((task, idx) => (
                                <div key={task.task} className="task-timeline-item">
                                  <div className="task-step-number">{idx + 1}</div>
                                  <div className="task-card">
                                    <div className="task-card-header">
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span className="task-agent-name">{task.agent} Agent</span>
                                        <span className="incident-id-tag">{task.task}</span>
                                      </div>
                                      <span className={`task-status-pill ${task.status === 'done' ? 'task-status-done' : (task.status === 'handed_off' ? 'task-status-handed' : 'task-status-failed')}`}>
                                        {task.status}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#e2e8f0' }}>
                                      Task Kind: <strong style={{ color: '#38bdf8' }}>{task.kind}</strong>
                                    </div>
                                    {task.handed_to && (
                                      <div className="task-handoff-info">
                                        Handed off to <strong style={{ color: '#fff' }}>{task.handed_to}</strong>: {task.reason || 'Next pipeline step'}
                                      </div>
                                    )}
                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                                      Started: {new Date(task.created_at * 1000).toLocaleTimeString()}
                                      {task.finished_at && ` • Finished: ${new Date(task.finished_at * 1000).toLocaleTimeString()}`}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 4. MEMORY & RESPONSE */}
                        {detailTab === 'memory' && (
                          <div className="memory-grid">
                            {/* Action Cards: Recommended vs Executed */}
                            <div className="action-cards-row">
                              {/* Recommended Playbook */}
                              <div className="action-card">
                                <div className="action-card-header">
                                  <Sparkles size={16} color="#38bdf8" />
                                  <h4>Recommended Playbook (Agent Pick)</h4>
                                </div>
                                <div className="playbook-callout">
                                  <strong>{incidentDetail.incident.recommended_playbook || 'None recommended'}</strong>
                                  <p>Selected based on procedural memory scores and similarity boosts from past resolved incidents.</p>
                                </div>
                                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                  Paged Responder: <strong style={{ color: '#fff' }}>{incidentDetail.page?.person || 'None'}</strong> ({incidentDetail.page?.team})
                                </div>
                                {incidentDetail.findings.find(f => f.agent === 'Responder') && (
                                  <div className="status-draft-box">
                                    {incidentDetail.findings.find(f => f.agent === 'Responder')?.claim}
                                  </div>
                                )}
                              </div>

                              {/* Executed Outcome */}
                              <div className="action-card">
                                <div className="action-card-header">
                                  <CheckCircle2 size={16} color="#34d399" />
                                  <h4>Executed Outcome (Operator Feedback)</h4>
                                </div>
                                {incidentDetail.outcome && incidentDetail.outcome.playbook_id ? (
                                  <div>
                                    <div className="playbook-callout" style={{ borderColor: 'rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.08)' }}>
                                      <strong style={{ color: '#38bdf8' }}>{incidentDetail.outcome.playbook} ({incidentDetail.outcome.playbook_id})</strong>
                                      <p>
                                        Status: {incidentDetail.outcome.worked ? 'Worked (Successful Fix)' : 'Failed (Did not resolve)'} • Resolved in {incidentDetail.outcome.minutes} min
                                      </p>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                      Resolver: <strong style={{ color: '#fff' }}>{incidentDetail.outcome.resolver || 'Unspecified'}</strong>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', padding: '16px 0' }}>
                                    Incident is currently open. No feedback recorded yet. Use the form below to simulate the operator resolution.
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Playbook Ranking Table */}
                            <div>
                              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#fff' }}>
                                Procedural Memory: Playbook Learned Rankings for {incidentDetail.origin}
                              </h4>
                              <div className="table-wrapper">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Playbook</th>
                                      <th>Wins</th>
                                      <th>Losses</th>
                                      <th>Base Score</th>
                                      <th>Similarity Boost</th>
                                      <th>Final Confidence</th>
                                      <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {incidentDetail.memory.playbooks.map(pb => (
                                      <tr key={pb.playbook_id} className={pb.recommended ? 'recommended-row' : ''}>
                                        <td>
                                          <strong>{pb.name}</strong>
                                          <div style={{ fontSize: 10, color: '#64748b' }}>{pb.playbook_id}</div>
                                        </td>
                                        <td>{pb.wins}</td>
                                        <td>{pb.losses}</td>
                                        <td>{pb.score.toFixed(3)}</td>
                                        <td>+{pb.boost?.toFixed(3) || '0.000'}</td>
                                        <td><strong style={{ color: pb.recommended ? '#34d399' : '#fff' }}>{pb.final?.toFixed(3) || pb.score.toFixed(3)}</strong></td>
                                        <td>
                                          {pb.recommended && (
                                            <span className="badge badge-resolved" style={{ fontSize: 9 }}>Recommended</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Similar Past Incidents Table */}
                            <div>
                              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#fff' }}>
                                Episodic Memory: Similar Past Incidents on {incidentDetail.origin}
                              </h4>
                              <div className="table-wrapper">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Incident</th>
                                      <th>Title</th>
                                      <th>Shared Alerts</th>
                                      <th>Change Caused</th>
                                      <th>Similarity Score</th>
                                      <th>Past Playbook</th>
                                      <th>Resolution Time</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {incidentDetail.memory.similar.length === 0 ? (
                                      <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', color: '#64748b' }}>No past incidents found for this service.</td>
                                      </tr>
                                    ) : (
                                      incidentDetail.memory.similar.map(sim => (
                                        <tr key={sim.incident}>
                                          <td><span className="incident-id-tag">{sim.incident}</span></td>
                                          <td>{sim.title}</td>
                                          <td>{sim.overlap} services</td>
                                          <td>{sim.change_caused ? 'Yes' : 'No'}</td>
                                          <td><strong style={{ color: '#38bdf8' }}>{sim.score}</strong></td>
                                          <td>{sim.playbook}</td>
                                          <td>{sim.minutes}m</td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Simulated Resolution Form (Demo Money Shot) */}
                            <div className="resolution-form-card">
                              <div className="resolution-form-header">
                                <h4>Record Simulated Operator Outcome</h4>
                                <div className="simulated-badge">Simulated outcome (synthetic environment)</div>
                                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                                  Closes the learning loop: updates the incident status, increments playbook win/loss counters, and shifts future Cypher ranking scores.
                                </p>
                              </div>

                              <form onSubmit={handleResolve}>
                                <div className="form-grid">
                                  <div className="form-field">
                                    <label>Applied Playbook</label>
                                    <select
                                      value={resolvePlaybook}
                                      onChange={e => setResolvePlaybook(e.target.value)}
                                      disabled={resolving || String(incidentDetail.incident.status).toLowerCase() === 'resolved'}
                                    >
                                      {incidentDetail.memory.playbooks.map(pb => (
                                        <option key={pb.playbook_id} value={pb.playbook_id}>
                                          {pb.name} ({pb.playbook_id})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="form-field">
                                    <label>Simulated Outcome</label>
                                    <select
                                      value={resolveWorked ? 'worked' : 'failed'}
                                      onChange={e => setResolveWorked(e.target.value === 'worked')}
                                      disabled={resolving || String(incidentDetail.incident.status).toLowerCase() === 'resolved'}
                                    >
                                      <option value="worked">Worked (Fix succeeded)</option>
                                      <option value="failed">Did Not Work (Fix failed)</option>
                                    </select>
                                  </div>

                                  <div className="form-field">
                                    <label>Minutes to Resolve</label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={1440}
                                      value={resolveMinutes}
                                      onChange={e => setResolveMinutes(Number(e.target.value))}
                                      disabled={resolving || String(incidentDetail.incident.status).toLowerCase() === 'resolved'}
                                    />
                                  </div>

                                  <div className="form-field">
                                    <label>Resolving Engineer</label>
                                    <input
                                      type="text"
                                      value={resolvePerson}
                                      onChange={e => setResolvePerson(e.target.value)}
                                      disabled={resolving || String(incidentDetail.incident.status).toLowerCase() === 'resolved'}
                                    />
                                  </div>
                                </div>

                                <button
                                  type="submit"
                                  className="btn-primary"
                                  disabled={resolving || String(incidentDetail.incident.status).toLowerCase() === 'resolved'}
                                >
                                  <Check size={15} />
                                  <span>
                                    {String(incidentDetail.incident.status).toLowerCase() === 'resolved'
                                      ? 'Incident Already Resolved'
                                      : (resolving ? 'Recording Learning Feedback...' : 'Record Simulated Resolution')}
                                  </span>
                                </button>
                              </form>

                              {/* Before vs After Learning Display */}
                              {learningResult && (
                                <div className="learning-result-banner">
                                  <Sparkles size={24} color="#34d399" />
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                                      Procedural Memory Updated!
                                    </div>
                                    <div className="learning-score-diff">
                                      Playbook {learningResult.playbook}: {learningResult.before.toFixed(3)} → {learningResult.after.toFixed(3)}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#a7f3d0', marginTop: 2 }}>
                                      Next incident on this service will rank this playbook higher and recognize this resolved incident in episodic recall.
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="controls-card" style={{ justifyContent: 'center', padding: 60, textAlign: 'center' }}>
                      <div>
                        <Activity size={32} color="#64748b" style={{ margin: '0 auto 12px' }} />
                        <h3>No Incident Selected</h3>
                        <p>Select an incident from the feed or click "Inject Demo Incident" to begin.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* COMPANY BRAIN (TRACK 3) VIEW */
            <div className="company-brain-container">
              <div className="brain-header">
                <h2>Company Brain: Organizational Knowledge Graph</h2>
                <p>
                  FalkorDB serves as the institutional memory layer: identifying critical single points of failure (people who are the only expert on a service), network centrality bottlenecks (PageRank), and topological bridge chokepoints (Betweenness).
                </p>
              </div>

              {knowledge ? (
                <div className="brain-grid">
                  {/* SPOF Card */}
                  <div className="brain-card">
                    <div className="brain-card-header">
                      <AlertTriangle size={18} color="#f87171" />
                      <h3>Knowledge Single Points of Failure</h3>
                    </div>
                    <div className="brain-card-desc">
                      Services where only 1 engineer has historical incident resolution experience. Critical operational risk.
                    </div>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Service</th>
                            <th>Tier</th>
                            <th>Sole Expert</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {knowledge.spof.map(s => (
                            <tr key={s.service}>
                              <td><strong>{s.service}</strong></td>
                              <td>Tier {s.tier}</td>
                              <td><span className="badge badge-sev1">1 person</span></td>
                              <td>
                                <button
                                  type="button"
                                  className="btn-ghost"
                                  style={{ padding: '2px 6px', fontSize: 11 }}
                                  onClick={() => setSelectedService(s.service)}
                                >
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* PageRank Card */}
                  <div className="brain-card">
                    <div className="brain-card-header">
                      <Layers size={18} color="#38bdf8" />
                      <h3>Most Depended-On Services</h3>
                    </div>
                    <div className="brain-card-desc">
                      Ranked by PageRank centrality over DEPENDS_ON edges in the company dependency graph.
                    </div>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Service</th>
                            <th>PageRank</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {knowledge.depended_on.map((d, idx) => (
                            <tr key={d.service}>
                              <td>#{idx + 1}</td>
                              <td><strong>{d.service}</strong></td>
                              <td>{d.score.toFixed(4)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn-ghost"
                                  style={{ padding: '2px 6px', fontSize: 11 }}
                                  onClick={() => setSelectedService(d.service)}
                                >
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Chokepoints (Betweenness) Card */}
                  <div className="brain-card">
                    <div className="brain-card-header">
                      <Network size={18} color="#a855f7" />
                      <h3>Topological Chokepoints</h3>
                    </div>
                    <div className="brain-card-desc">
                      Services with highest Betweenness Centrality; failures here cascade across divergent subsystem clusters.
                    </div>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Service</th>
                            <th>Betweenness</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {knowledge.chokepoints.map((c, idx) => (
                            <tr key={c.service}>
                              <td>#{idx + 1}</td>
                              <td><strong>{c.service}</strong></td>
                              <td>{c.score.toFixed(1)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn-ghost"
                                  style={{ padding: '2px 6px', fontSize: 11 }}
                                  onClick={() => setSelectedService(c.service)}
                                >
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                  Loading Company Brain graph analytics from FalkorDB...
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* SERVICE PROFILE DRAWER */}
      {selectedService && (
        <div className="drawer-backdrop" onClick={() => setSelectedService(null)}>
          <div className="drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title-group">
                <span style={{ fontSize: 11, color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700 }}>Service Profile</span>
                <h2>{selectedService}</h2>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setSelectedService(null)}>
                <X size={18} />
              </button>
            </div>

            {loadingService ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                Loading service graph profile...
              </div>
            ) : serviceProfile ? (
              <>
                <div className="drawer-meta-grid">
                  <div className="drawer-meta-box">
                    <span>Owning Team</span>
                    <strong>{serviceProfile.info.team}</strong>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{serviceProfile.info.channel}</div>
                  </div>
                  <div className="drawer-meta-box">
                    <span>Tier & SLO</span>
                    <strong>Tier {serviceProfile.info.tier}</strong>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>p99 Target: {serviceProfile.info.slo_ms}ms ({serviceProfile.info.language})</div>
                  </div>
                </div>

                {/* On Call */}
                <div>
                  <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8 }}>
                    Current On-Call Responder
                  </h4>
                  {serviceProfile.on_call.length > 0 ? (
                    <div className="action-card" style={{ padding: 14 }}>
                      <strong style={{ color: '#fff', fontSize: 14 }}>{serviceProfile.on_call[0].person}</strong>
                      <div style={{ fontSize: 12, color: '#38bdf8', marginTop: 2 }}>
                        {serviceProfile.on_call[0].role} • {serviceProfile.on_call[0].team}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                        Channel: {serviceProfile.on_call[0].channel} • Prior fixes: {serviceProfile.on_call[0].prior_fixes}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#64748b' }}>No active on-call engineer assigned.</div>
                  )}
                </div>

                {/* Experts */}
                <div>
                  <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8 }}>
                    Known Incident Experts
                  </h4>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Engineer</th>
                          <th>Role</th>
                          <th>Fixed</th>
                          <th>Avg Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serviceProfile.experts.length === 0 ? (
                          <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>No prior incident resolvers recorded.</td></tr>
                        ) : (
                          serviceProfile.experts.map(exp => (
                            <tr key={exp.person}>
                              <td><strong>{exp.person}</strong></td>
                              <td>{exp.role}</td>
                              <td><span className="badge badge-resolved">{exp.incidents} incidents</span></td>
                              <td>{exp.avg_minutes} min</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Dependencies */}
                <div>
                  <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8 }}>
                    Graph Dependencies
                  </h4>
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Upstream Dependencies (This service depends on):</span>
                    <div className="dependency-badges-wrap">
                      {serviceProfile.neighbors.depends_on.map(dep => (
                        <button
                          key={dep}
                          type="button"
                          className="dependency-badge"
                          onClick={() => setSelectedService(dep)}
                        >
                          {dep}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Downstream Consumers (Depend on this service):</span>
                    <div className="dependency-badges-wrap">
                      {serviceProfile.neighbors.dependents.map(dep => (
                        <button
                          key={dep}
                          type="button"
                          className="dependency-badge"
                          onClick={() => setSelectedService(dep)}
                        >
                          {dep}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Incident History */}
                <div>
                  <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8 }}>
                    Service Incident History
                  </h4>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Incident</th>
                          <th>Title</th>
                          <th>Root Cause</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serviceProfile.incidents.length === 0 ? (
                          <tr><td colSpan={3} style={{ textAlign: 'center', color: '#64748b' }}>No incidents recorded on this service.</td></tr>
                        ) : (
                          serviceProfile.incidents.map(hist => (
                            <tr key={hist.id}>
                              <td><span className="incident-id-tag">{hist.id}</span></td>
                              <td>{hist.title}</td>
                              <td><span style={{ color: '#94a3b8', fontSize: 11 }}>{hist.cause || 'Under investigation'}</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
