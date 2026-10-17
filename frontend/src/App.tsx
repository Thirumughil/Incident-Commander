import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { ServiceProfileDrawer } from './components/ServiceProfileDrawer'
import { OverviewPage } from './pages/OverviewPage'
import { GraphPage } from './pages/GraphPage'
import { WhyPage } from './pages/WhyPage'
import { CoordinationPage } from './pages/CoordinationPage'
import { MemoryPage } from './pages/MemoryPage'
import { BrainPage } from './pages/BrainPage'
import { AuroraFlow } from './components/AuroraFlow'
import type {
  IncidentSummary,
  IncidentDetail,
  KnowledgeView,
  ServiceProfile,
  PageRoute
} from './types'
import './App.css'

const API_BASE = 'http://127.0.0.1:8000'

function parseRouteFromHash(): PageRoute {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase()
  if (hash === 'graph') return 'graph'
  if (hash === 'why') return 'why'
  if (hash === 'coordination') return 'coordination'
  if (hash === 'memory') return 'memory'
  if (hash === 'brain') return 'brain'
  return 'overview'
}

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<PageRoute>(parseRouteFromHash)
  const [tenant, setTenant] = useState<string>('acme')
  const [tenants, setTenants] = useState<string[]>(['acme', 'globex'])
  const [apiOnline, setApiOnline] = useState<boolean>(false)

  // Incidents
  const [incidents, setIncidents] = useState<IncidentSummary[]>([])
  const [feedFilter, setFeedFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)
  const [incidentDetail, setIncidentDetail] = useState<IncidentDetail | null>(null)

  // Status & notifications
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

  // Navigation router with hash support
  const handleNavigate = useCallback((route: PageRoute) => {
    setCurrentRoute(route)
    window.location.hash = `/${route}`
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Listen to browser forward/back hash changes
  useEffect(() => {
    function onHashChange() {
      setCurrentRoute(parseRouteFromHash())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Check health and list tenants
  useEffect(() => {
    async function init() {
      try {
        const healthRes = await fetch(`${API_BASE}/health`)
        setApiOnline(healthRes.ok)

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
  const loadIncidents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/incidents?tenant=${encodeURIComponent(tenant)}`)
      if (res.ok) {
        const data = await res.json()
        const rows: IncidentSummary[] = data.incidents || []
        setIncidents(rows)
        if (rows.length > 0) {
          setSelectedIncidentId(prev => {
            if (prev && rows.some(r => r.id === prev)) return prev
            const firstOpen = rows.find(i => String(i.status).toLowerCase() === 'open')
            return firstOpen ? firstOpen.id : rows[0].id
          })
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
  }, [tenant])

  useEffect(() => {
    void loadIncidents()
    setLearningResult(null)
  }, [loadIncidents])

  // Load single incident detail
  const loadDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/incidents/${encodeURIComponent(id)}?tenant=${encodeURIComponent(tenant)}`)
      if (res.ok) {
        const data: IncidentDetail = await res.json()
        setIncidentDetail(data)
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
  }, [tenant])

  useEffect(() => {
    if (selectedIncidentId) {
      void loadDetail(selectedIncidentId)
    } else {
      setIncidentDetail(null)
    }
  }, [selectedIncidentId, loadDetail])

  // Load Company Brain knowledge when needed
  const loadKnowledge = useCallback(async () => {
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
  }, [tenant])

  useEffect(() => {
    if (currentRoute === 'brain' || !knowledge) {
      void loadKnowledge()
    }
  }, [currentRoute, loadKnowledge, knowledge])

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
            message: 'No open alerts to group. Injected alerts already grouped into an incident. Click "Inject Demo" to simulate another.'
          })
        } else {
          const newlyOpened = data.opened[0]?.incident
          setNotice({
            type: 'success',
            message: `Agent pipeline finished: Opened and analyzed incident ${newlyOpened} across Detector, Analyzer, and Responder.`
          })
          await loadIncidents()
          if (newlyOpened) {
            setSelectedIncidentId(newlyOpened)
            handleNavigate('graph')
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
          message: `Closed-loop learning recorded for ${selectedIncidentId}: ${data.playbook} moved from ${data.before.toFixed(3)} to ${data.after.toFixed(3)}.`
        })
        await Promise.all([loadDetail(selectedIncidentId), loadIncidents()])
      } else {
        setNotice({ type: 'error', message: data.detail || 'Incident resolution failed.' })
      }
    } catch (err) {
      setNotice({ type: 'error', message: `Resolution failed: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="app-shell-root">
      {/* Framer AuroraFlow WebGL background with Salt & Pepper color palette */}
      <AuroraFlow
        background="#07080a"
        color1="#f8fafc"
        color2="#334155"
        speed={35}
        size={110}
        reach={280}
      />

      {/* Global Professional Header with Navigation & Incident Selector */}
      <Header
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        tenant={tenant}
        tenants={tenants}
        onTenantChange={setTenant}
        apiOnline={apiOnline}
        incidents={incidents}
        selectedIncidentId={selectedIncidentId}
        onSelectIncident={setSelectedIncidentId}
        onInject={handleInject}
        injecting={injecting}
        onRunAgents={handleRunPipeline}
        running={running}
        onRefresh={() => {
          void loadIncidents()
          if (selectedIncidentId) void loadDetail(selectedIncidentId)
          void loadKnowledge()
        }}
      />

      {/* Notice Banner */}
      {notice && (
        <div className={`global-notice-bar ${notice.type}`}>
          <span>{notice.message}</span>
          <button type="button" className="notice-dismiss-btn" onClick={() => setNotice(null)}>
            &times;
          </button>
        </div>
      )}

      {/* Main Page Content (Modular Separated Views) */}
      <main className="main-content-viewport">
        {currentRoute === 'overview' && (
          <OverviewPage
            incidents={incidents}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={setSelectedIncidentId}
            incidentDetail={incidentDetail}
            feedFilter={feedFilter}
            setFeedFilter={setFeedFilter}
            onNavigate={handleNavigate}
            onInject={handleInject}
            injecting={injecting}
            onRunAgents={handleRunPipeline}
            running={running}
          />
        )}

        {currentRoute === 'graph' && (
          <GraphPage
            detail={incidentDetail}
            onSelectService={setSelectedService}
            onNavigate={handleNavigate}
          />
        )}

        {currentRoute === 'why' && (
          <WhyPage
            detail={incidentDetail}
            onNavigate={handleNavigate}
            onSelectService={setSelectedService}
          />
        )}

        {currentRoute === 'coordination' && (
          <CoordinationPage
            detail={incidentDetail}
            onNavigate={handleNavigate}
          />
        )}

        {currentRoute === 'memory' && (
          <MemoryPage
            detail={incidentDetail}
            onNavigate={handleNavigate}
            resolvePlaybook={resolvePlaybook}
            setResolvePlaybook={setResolvePlaybook}
            resolveWorked={resolveWorked}
            setResolveWorked={setResolveWorked}
            resolveMinutes={resolveMinutes}
            setResolveMinutes={setResolveMinutes}
            resolvePerson={resolvePerson}
            setResolvePerson={setResolvePerson}
            onResolve={handleResolve}
            resolving={resolving}
            learningResult={learningResult}
          />
        )}

        {currentRoute === 'brain' && (
          <BrainPage
            knowledge={knowledge}
            tenant={tenant}
            onSelectService={setSelectedService}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {/* Deep-Dive Service Profile Drawer */}
      <ServiceProfileDrawer
        selectedService={selectedService}
        serviceProfile={serviceProfile}
        loadingService={loadingService}
        onClose={() => setSelectedService(null)}
        onSelectService={setSelectedService}
      />

      {/* Global Professional Footer */}
      <Footer
        tenant={tenant}
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
      />
    </div>
  )
}
