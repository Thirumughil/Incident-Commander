import React, { useState } from 'react'
import {
  Activity, AlertTriangle, CheckCircle2,
  ArrowRight, Network, Sparkles, Users, Layers, Play,
  List
} from 'lucide-react'
import type { IncidentSummary, IncidentDetail, PageRoute } from '../types'
import { AnimatedPath } from '../components/AnimatedPath'
import { AnimatedAccordion, type AccordionItemData } from '../components/AnimatedAccordion'
import { FluidButton } from '../components/FluidButton'

interface OverviewPageProps {
  incidents: IncidentSummary[]
  selectedIncidentId: string | null
  onSelectIncident: (id: string) => void
  incidentDetail: IncidentDetail | null
  feedFilter: 'all' | 'open' | 'resolved'
  setFeedFilter: (f: 'all' | 'open' | 'resolved') => void
  onNavigate: (route: PageRoute) => void
  onInject: () => void
  injecting: boolean
  onRunAgents: () => void
  running: boolean
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  incidentDetail,
  feedFilter,
  setFeedFilter,
  onNavigate,
  onInject,
  injecting,
  onRunAgents,
  running,
}) => {
  const [feedViewMode, setFeedViewMode] = useState<'accordion' | 'table'>('accordion')

  const filteredIncidents = incidents.filter((i) => {
    if (feedFilter === 'open') return String(i.status).toLowerCase() === 'open'
    if (feedFilter === 'resolved') return String(i.status).toLowerCase() === 'resolved'
    return true
  })

  const openCount = incidents.filter(i => String(i.status).toLowerCase() === 'open').length
  const resolvedCount = incidents.filter(i => String(i.status).toLowerCase() === 'resolved').length

  function formatTime(timestamp?: number | null) {
    if (!timestamp) return '—'
    return new Date(timestamp * 1000).toLocaleString([], {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const incidentAccordionItems: AccordionItemData[] = filteredIncidents.map((inc) => {
    const isSelected = inc.id === selectedIncidentId
    const isOpen = String(inc.status).toLowerCase() === 'open'
    return {
      id: inc.id,
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ color: isOpen ? '#f87171' : '#34d399', fontWeight: 700, fontSize: 13 }}>
            {inc.id}
          </span>
          <span style={{ color: '#f8fafc', fontSize: 13, fontWeight: 500 }}>
            {inc.title}
          </span>
        </div>
      ),
      badge: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={`status-pill ${inc.status}`}>
            {inc.status.toUpperCase()}
          </span>
          <span className={`severity-tag ${inc.severity.toLowerCase()}`}>
            {inc.severity.toUpperCase()}
          </span>
          {isSelected && (
            <span
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 6,
                fontWeight: 700,
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                border: '1px solid #38bdf8',
              }}
            >
              SELECTED
            </span>
          )}
        </div>
      ),
      accentColor: isOpen ? '#ef4444' : '#38bdf8',
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 12 }}>
            <div>
              <span style={{ color: '#64748b' }}>Root Origin Service: </span>
              <strong style={{ color: '#f87171' }}>{inc.origin || 'currency'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Recommended Playbook: </span>
              <strong style={{ color: '#38bdf8' }}>{inc.recommended_playbook || 'PB-04'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Dispatched SRE: </span>
              <strong style={{ color: '#a855f7' }}>{inc.paged || 'Priya Raman'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Incident Started: </span>
              <strong style={{ color: '#94a3b8' }}>{formatTime(inc.started_at)}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <FluidButton
              variant="glass"
              size="sm"
              icon={<Network size={12} color="#38bdf8" />}
              text="Inspect in 3D Graph"
              onClick={() => {
                onSelectIncident(inc.id)
                onNavigate('graph')
              }}
            />
            <FluidButton
              variant="glass"
              size="sm"
              icon={<Sparkles size={12} color="#f59e0b" />}
              text="Why Cypher Audit"
              onClick={() => {
                onSelectIncident(inc.id)
                onNavigate('why')
              }}
            />
            <FluidButton
              variant={isSelected ? 'primary' : 'glass'}
              size="sm"
              text={isSelected ? '✓ Active Incident' : 'Set as Active Incident'}
              onClick={() => onSelectIncident(inc.id)}
            />
          </div>
        </div>
      ),
    }
  })

  return (
    <div className="page-container overview-page-container">
      {/* KPI Stats Row */}
      <div className="overview-kpi-grid">
        <div className="kpi-card open-incidents">
          <div className="kpi-header">
            <span className="kpi-title">ACTIVE INCIDENTS</span>
            <AlertTriangle size={18} color="#ef4444" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-big-number">{openCount}</span>
            <span className="kpi-tag-alert">Needs Response</span>
          </div>
          <span className="kpi-footer-sub">Autonomous agents monitor live firing alerts</span>
        </div>

        <div className="kpi-card resolved-incidents">
          <div className="kpi-header">
            <span className="kpi-title">RESOLVED INCIDENTS</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-big-number">{resolvedCount}</span>
            <span className="kpi-tag-good">Knowledge Stored</span>
          </div>
          <span className="kpi-footer-sub">Closed-loop Bayesian weights updated in FalkorDB</span>
        </div>

        <div className="kpi-card multi-agent">
          <div className="kpi-header">
            <span className="kpi-title">AUTONOMOUS PIPELINE</span>
            <Activity size={18} color="#38bdf8" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-status-online">READY</span>
            <span className="kpi-tag-sub">4 Coordinated Agents</span>
          </div>
          <span className="kpi-footer-sub">Detector &bull; Analyzer &bull; Responder &bull; Learner</span>
        </div>

        <div className="kpi-card quick-sim-card">
          <div className="kpi-header">
            <span className="kpi-title">DEMO ACTIONS</span>
            <Play size={16} color="#f59e0b" />
          </div>
          <div className="quick-sim-buttons">
            <FluidButton
              variant="amber"
              size="sm"
              icon={<Activity size={13} />}
              text={injecting ? 'Injecting...' : '1. Inject Demo Failure'}
              onClick={onInject}
              disabled={injecting}
              style={{ width: '100%', justifyContent: 'flex-start' }}
            />
            <FluidButton
              variant="primary"
              size="sm"
              icon={<Play size={13} />}
              text={running ? 'Running Pipeline...' : '2. Run Agent Pipeline'}
              onClick={onRunAgents}
              disabled={running}
              style={{ width: '100%', justifyContent: 'flex-start' }}
            />
          </div>
        </div>
      </div>

      {/* Selected Incident Spotlight Section (Jump Launchpad) */}
      {incidentDetail && (
        <div className="incident-spotlight-card">
          <div className="spotlight-top-strip">
            <div className="spotlight-badge-title">
              <span className={`status-pill ${incidentDetail.incident.status}`}>
                {incidentDetail.incident.status.toUpperCase()}
              </span>
              <span className="spotlight-id">{incidentDetail.incident.id}</span>
              <h2>{incidentDetail.incident.title}</h2>
            </div>

            <div className="spotlight-meta-tags">
              <span className="spotlight-tag">
                Origin: <strong>{incidentDetail.graph.origin || 'Unknown'}</strong>
              </span>
              {incidentDetail.graph.change && (
                <span className="spotlight-tag change">
                  Change: <strong>{incidentDetail.graph.change.change}</strong>
                </span>
              )}
              {incidentDetail.page && (
                <span className="spotlight-tag paged">
                  Paged: <strong>{incidentDetail.page.person}</strong> ({incidentDetail.page.role})
                </span>
              )}
            </div>
          </div>

          <div className="spotlight-launchpad-row">
            <div className="launchpad-instructions">
              <span className="launchpad-flow-tag">INCIDENT RESOLUTION LIFECYCLE:</span>
              <span className="launchpad-flow-sub">FalkorDB Multi-Agent Connected Graph Path</span>
            </div>

            {/* Framer AnimatedPath connecting the 4 dedicated incident investigation stages */}
            <div className="launchpad-animated-stream-wrap">
              <AnimatedPath
                path="M 110 18 C 240 2 340 34 460 18 C 580 2 680 34 800 18 C 920 2 1020 34 1140 18"
                points={[
                  { x: 110, y: 18, label: '1. 3D Topology', sublabel: 'Blast Radius', color: '#38bdf8' },
                  { x: 460, y: 18, label: '2. Cypher Audit', sublabel: 'Grounded Evidence', color: '#f59e0b' },
                  { x: 800, y: 18, label: '3. Agent Coordination', sublabel: 'Parallel Dispatch', color: '#a855f7' },
                  { x: 1140, y: 18, label: '4. Memory & Learning', sublabel: 'Laplace Prior', color: '#10b981' },
                ]}
                viewWidth={1250}
                viewHeight={42}
                lineColor="rgba(56, 189, 248, 0.25)"
                glowColor="#38bdf8"
                dotSize={9}
                speed={140}
                strokeWidth={1.75}
                trailLength={0.3}
                dashLength={6}
                gapLength={6}
                showLabels={true}
              />
            </div>

            <div className="launchpad-buttons-grid">
              <button
                type="button"
                className="launch-card-btn graph-btn"
                onClick={() => onNavigate('graph')}
              >
                <div className="btn-icon-wrap"><Network size={18} /></div>
                <div className="btn-text-wrap">
                  <strong>Progressive 3D Graph</strong>
                  <span>Interactive WebGL force field &amp; blast radius</span>
                </div>
                <ArrowRight size={15} className="arrow-icon" />
              </button>

              <button
                type="button"
                className="launch-card-btn why-btn"
                onClick={() => onNavigate('why')}
              >
                <div className="btn-icon-wrap"><Sparkles size={18} /></div>
                <div className="btn-text-wrap">
                  <strong>"Why?" Evidence Panel</strong>
                  <span>Grounded FalkorDB Cypher queries &amp; confidence</span>
                </div>
                <ArrowRight size={15} className="arrow-icon" />
              </button>

              <button
                type="button"
                className="launch-card-btn coord-btn"
                onClick={() => onNavigate('coordination')}
              >
                <div className="btn-icon-wrap"><Users size={18} /></div>
                <div className="btn-text-wrap">
                  <strong>Agent Coordination Tasks</strong>
                  <span>Multi-agent timeline, handoffs &amp; status</span>
                </div>
                <ArrowRight size={15} className="arrow-icon" />
              </button>

              <button
                type="button"
                className="launch-card-btn memory-btn"
                onClick={() => onNavigate('memory')}
              >
                <div className="btn-icon-wrap"><Layers size={18} /></div>
                <div className="btn-text-wrap">
                  <strong>Memory &amp; Response</strong>
                  <span>Laplace playbook rankings &amp; operator feedback</span>
                </div>
                <ArrowRight size={15} className="arrow-icon" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incidents Table */}
      <div className="incidents-feed-section">
        <div className="feed-header-bar">
          <div className="feed-title-cluster">
            <h3>Incident Operations Feed</h3>
            <span className="feed-counter">({filteredIncidents.length} shown)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* View Mode Toggle: Animated Accordion vs Table */}
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`mode-btn ${feedViewMode === 'accordion' ? 'active' : ''}`}
                onClick={() => setFeedViewMode('accordion')}
                title="Framer Animated Accordion View"
              >
                <Layers size={13} />
                <span>Animated Accordion</span>
              </button>
              <button
                type="button"
                className={`mode-btn ${feedViewMode === 'table' ? 'active' : ''}`}
                onClick={() => setFeedViewMode('table')}
                title="Compact Table View"
              >
                <List size={13} />
                <span>Table</span>
              </button>
            </div>

            <div className="feed-filter-toggle">
              <button
                type="button"
                className={`filter-btn ${feedFilter === 'all' ? 'active' : ''}`}
                onClick={() => setFeedFilter('all')}
              >
                All ({incidents.length})
              </button>
              <button
                type="button"
                className={`filter-btn ${feedFilter === 'open' ? 'active' : ''}`}
                onClick={() => setFeedFilter('open')}
              >
                Open ({openCount})
              </button>
              <button
                type="button"
                className={`filter-btn ${feedFilter === 'resolved' ? 'active' : ''}`}
                onClick={() => setFeedFilter('resolved')}
              >
                Resolved ({resolvedCount})
              </button>
            </div>
          </div>
        </div>

        {feedViewMode === 'accordion' ? (
          <div className="accordion-feed-wrapper" style={{ padding: '20px 24px' }}>
            {filteredIncidents.length === 0 ? (
              <div className="empty-row-notice">No incidents matching this filter.</div>
            ) : (
              <AnimatedAccordion
                items={incidentAccordionItems}
                accentColor="#38bdf8"
                type="single"
                defaultOpenIndex={Math.max(0, filteredIncidents.findIndex(i => i.id === selectedIncidentId))}
              />
            )}
          </div>
        ) : (
          <div className="table-responsive-wrapper">
          <table className="incident-feed-table">
            <thead>
              <tr>
                <th>Incident ID</th>
                <th>Status</th>
                <th>Severity</th>
                <th>Title &amp; Summary</th>
                <th>Root Origin</th>
                <th>Recommended Playbook</th>
                <th>Dispatched Expert</th>
                <th>Started At</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-row-notice">
                    No incidents matching this filter.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => {
                  const isSelected = inc.id === selectedIncidentId
                  return (
                    <tr
                      key={inc.id}
                      className={`incident-table-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => onSelectIncident(inc.id)}
                    >
                      <td className="mono-cell incident-id-cell">{inc.id}</td>
                      <td>
                        <span className={`status-pill ${inc.status}`}>
                          {inc.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`severity-tag ${inc.severity.toLowerCase()}`}>
                          {inc.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="title-cell">
                        <strong>{inc.title}</strong>
                      </td>
                      <td className="origin-cell">
                        {inc.origin ? <span className="origin-badge">{inc.origin}</span> : '—'}
                      </td>
                      <td className="playbook-cell">
                        {inc.recommended_playbook ? (
                          <span className="playbook-pill">{inc.recommended_playbook}</span>
                        ) : '—'}
                      </td>
                      <td className="paged-cell">{inc.paged || '—'}</td>
                      <td className="time-cell">{formatTime(inc.started_at)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="table-inspect-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectIncident(inc.id)
                            onNavigate('graph')
                          }}
                        >
                          Inspect 3D Graph &rarr;
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
