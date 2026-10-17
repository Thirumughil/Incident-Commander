import React from 'react'
import {
  ShieldAlert, Activity, RefreshCw, Play, Sparkles,
  Layers, BrainCircuit, Users, Network, Compass, CheckCircle2, AlertTriangle
} from 'lucide-react'
import type { IncidentSummary, PageRoute } from '../types'
import { FloatingPillNavigation, type FloatingPillItem } from './FloatingPillNavigation'

interface HeaderProps {
  currentRoute: PageRoute
  onNavigate: (route: PageRoute) => void
  tenant: string
  tenants: string[]
  onTenantChange: (tenant: string) => void
  apiOnline: boolean
  incidents: IncidentSummary[]
  selectedIncidentId: string | null
  onSelectIncident: (id: string) => void
  onInject: () => void
  injecting: boolean
  onRunAgents: () => void
  running: boolean
  onRefresh: () => void
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onNavigate,
  tenant,
  tenants,
  onTenantChange,
  apiOnline,
  incidents,
  selectedIncidentId,
  onSelectIncident,
  onInject,
  injecting,
  onRunAgents,
  running,
  onRefresh,
}) => {
  const selectedIncident = incidents.find(i => i.id === selectedIncidentId)

  const navItems: FloatingPillItem[] = [
    { id: 'overview', label: 'Operations Feed', icon: <Compass size={15} /> },
    { id: 'graph', label: 'Incident Graph', icon: <Network size={15} />, badge: '3D Motion', badgeColor: '#38bdf8' },
    { id: 'why', label: '"Why?" Evidence', icon: <Sparkles size={15} />, badge: 'Cypher Audit', badgeColor: '#f59e0b' },
    { id: 'coordination', label: 'Agent Tasks', icon: <Users size={15} />, badge: '4 Agents', badgeColor: '#a855f7' },
    { id: 'memory', label: 'Memory & Response', icon: <Layers size={15} />, badge: 'Laplace Learn', badgeColor: '#10b981' },
    { id: 'brain', label: 'Company Brain', icon: <BrainCircuit size={15} />, badge: 'Track 3', badgeColor: '#6366f1' },
  ]

  return (
    <header className="global-header">
      {/* Top Bar: Brand, Tenant, Quick Actions & System Health */}
      <div className="header-top-bar">
        <div className="header-brand-cluster" onClick={() => onNavigate('overview')} role="button" tabIndex={0}>
          <div className="brand-logo-pill">
            <ShieldAlert size={22} className="brand-shield-icon" />
            <div className="brand-pulse-dot" />
          </div>
          <div className="brand-titles">
            <div className="brand-primary-row">
              <span className="brand-name">INCIDENT COMMANDER</span>
              <span className="brand-edition-badge">GRAPH HACKS 2026</span>
            </div>
            <span className="brand-subline">FalkorDB Graph-Native Multi-Agent Orchestrator</span>
          </div>
        </div>

        {/* Global Incident Selector Strip */}
        <div className="header-incident-selector-wrap">
          <label htmlFor="global-incident-select" className="incident-selector-label">
            ACTIVE INCIDENT:
          </label>
          <div className="incident-dropdown-container">
            <select
              id="global-incident-select"
              value={selectedIncidentId || ''}
              onChange={(e) => onSelectIncident(e.target.value)}
              className="global-incident-select"
            >
              {incidents.length === 0 ? (
                <option value="">No incidents found</option>
              ) : (
                incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.id} — {inc.title.slice(0, 36)} ({inc.status.toUpperCase()})
                  </option>
                ))
              )}
            </select>
            {selectedIncident && (
              <span className={`status-pill-mini ${selectedIncident.status === 'open' ? 'open' : 'resolved'}`}>
                {selectedIncident.status === 'open' ? (
                  <><AlertTriangle size={11} /> OPEN</>
                ) : (
                  <><CheckCircle2 size={11} /> RESOLVED</>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Right Utility Cluster: Tenant Switcher, Pipeline Actions, Health */}
        <div className="header-action-cluster">
          {/* Tenant Selector */}
          <div className="tenant-selector-pill">
            <span className="tenant-label">TENANT:</span>
            <select
              value={tenant}
              onChange={(e) => onTenantChange(e.target.value)}
              className="tenant-select-box"
              title="Switch Isolated Tenant Graph"
            >
              {tenants.map((t) => (
                <option key={t} value={t}>
                  {t.toUpperCase()} {t === 'acme' ? '(Primary)' : '(Isolated)'}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Actions */}
          <button
            type="button"
            className="header-action-btn inject-btn"
            onClick={onInject}
            disabled={injecting}
            title="Inject Synthetic Microservice Failure on currency service"
          >
            <Activity size={13} />
            <span>{injecting ? 'Injecting...' : 'Inject Demo'}</span>
          </button>

          <button
            type="button"
            className="header-action-btn run-btn"
            onClick={onRunAgents}
            disabled={running}
            title="Run Multi-Agent Pipeline (Detector -> Analyzer -> Responder)"
          >
            <Play size={13} />
            <span>{running ? 'Running...' : 'Run Agents'}</span>
          </button>

          <button
            type="button"
            className="header-icon-btn refresh-btn"
            onClick={onRefresh}
            title="Refresh All Graph Data"
          >
            <RefreshCw size={14} />
          </button>

          {/* System Health Indicators */}
          <div className="health-badges-group">
            <div className={`health-pill ${apiOnline ? 'healthy' : 'down'}`} title="FastAPI Uvicorn Service at http://127.0.0.1:8000">
              <span className="health-indicator-dot" />
              <span>{apiOnline ? 'API 8000' : 'API Offline'}</span>
            </div>
            <div className="health-pill healthy" title="FalkorDB Redis Graph Engine at localhost:6380">
              <span className="health-indicator-dot falkordb" />
              <span>FalkorDB :6380</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Framer Floating Pill Navigation */}
      <div className="header-nav-bar-wrapper">
        <FloatingPillNavigation
          items={navItems}
          activeRoute={currentRoute}
          onNavigate={onNavigate}
        />
      </div>
    </header>
  )
}
