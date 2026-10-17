import React, { useState, useRef, useEffect } from 'react'
import {
  ShieldAlert, Activity, RefreshCw, Play, Sparkles,
  Layers, BrainCircuit, Users, Network, Compass, CheckCircle2, AlertTriangle,
  ChevronDown, X, Database, ListFilter
} from 'lucide-react'
import type { IncidentSummary, PageRoute } from '../types'
import { FloatingPillNavigation, type FloatingPillItem } from './FloatingPillNavigation'
import { AnimatedPath, HEADER_STREAM_PATH, HEADER_STREAM_POINTS } from './AnimatedPath'
import { AnimatedAccordion, type AccordionItemData } from './AnimatedAccordion'
import { CTAActionButton } from './CTAActionButton'

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

  const [showIncidentAccordion, setShowIncidentAccordion] = useState<boolean>(false)
  const [showTenantAccordion, setShowTenantAccordion] = useState<boolean>(false)
  const incidentFlyoutRef = useRef<HTMLDivElement | null>(null)
  const tenantFlyoutRef = useRef<HTMLDivElement | null>(null)

  // Click outside listener to dismiss popovers
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (incidentFlyoutRef.current && !incidentFlyoutRef.current.contains(e.target as Node)) {
        setShowIncidentAccordion(false)
      }
      if (tenantFlyoutRef.current && !tenantFlyoutRef.current.contains(e.target as Node)) {
        setShowTenantAccordion(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navItems: FloatingPillItem[] = [
    { id: 'overview', label: 'Operations Feed', icon: <Compass size={15} /> },
    { id: 'graph', label: 'Incident Graph', icon: <Network size={15} />, badge: '3D Motion', badgeColor: '#38bdf8' },
    { id: 'why', label: '"Why?" Evidence', icon: <Sparkles size={15} />, badge: 'Cypher Audit', badgeColor: '#f59e0b' },
    { id: 'coordination', label: 'Agent Tasks', icon: <Users size={15} />, badge: '4 Agents', badgeColor: '#a855f7' },
    { id: 'memory', label: 'Memory & Response', icon: <Layers size={15} />, badge: 'Laplace Learn', badgeColor: '#10b981' },
    { id: 'brain', label: 'Company Brain', icon: <BrainCircuit size={15} />, badge: 'Track 3', badgeColor: '#6366f1' },
  ]

  // AnimatedAccordion items for Active & Historical Incidents
  const incidentAccordionItems: AccordionItemData[] = incidents.map((inc) => {
    const isCurrent = inc.id === selectedIncidentId
    const isOpen = inc.status === 'open'
    return {
      id: inc.id,
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: isOpen ? '#f87171' : '#34d399', fontWeight: 700, fontSize: 12 }}>
            {inc.id}
          </span>
          <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>
            {inc.title}
          </span>
        </div>
      ),
      badge: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 6,
              fontWeight: 700,
              background: isOpen ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: isOpen ? '#ef4444' : '#10b981',
              border: `1px solid ${isOpen ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            }}
          >
            {isOpen ? 'OPEN' : 'RESOLVED'}
          </span>
          {isCurrent && (
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
              ACTIVE
            </span>
          )}
        </div>
      ),
      accentColor: isOpen ? '#ef4444' : '#38bdf8',
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: 11 }}>
            <div>
              <span style={{ color: '#64748b' }}>Root Origin: </span>
              <strong style={{ color: '#f87171' }}>{inc.origin || 'currency'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Severity: </span>
              <strong style={{ color: '#f59e0b' }}>{inc.severity.toUpperCase()}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Playbook: </span>
              <strong style={{ color: '#38bdf8' }}>{inc.recommended_playbook || 'PB-04'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Dispatched SRE: </span>
              <strong style={{ color: '#a855f7' }}>{inc.paged || 'Priya Raman'}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelectIncident(inc.id)
                setShowIncidentAccordion(false)
              }}
              style={{
                padding: '6px 14px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                background: isCurrent ? 'rgba(56, 189, 248, 0.2)' : '#1e2c3f',
                color: isCurrent ? '#38bdf8' : '#ffffff',
                border: `1px solid ${isCurrent ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                cursor: 'pointer',
              }}
            >
              {isCurrent ? '✓ Currently Active Incident' : 'Switch to this Incident'}
            </button>
          </div>
        </div>
      ),
    }
  })

  // AnimatedAccordion items for Isolated Tenants
  const tenantAccordionItems: AccordionItemData[] = tenants.map((t) => {
    const isCurrent = t === tenant
    const isPrimary = t === 'acme'
    return {
      id: t,
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, color: isPrimary ? '#38bdf8' : '#a855f7', fontSize: 13 }}>
            {t.toUpperCase()}
          </span>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>
            {isPrimary ? 'Primary Production Graph' : 'Isolated Tenant Graph'}
          </span>
        </div>
      ),
      badge: (
        <span
          style={{
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 6,
            fontWeight: 700,
            background: isCurrent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: isCurrent ? '#34d399' : '#94a3b8',
            border: `1px solid ${isCurrent ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
          }}
        >
          {isCurrent ? 'CURRENT GRAPH' : 'AVAILABLE'}
        </span>
      ),
      accentColor: isPrimary ? '#38bdf8' : '#a855f7',
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
          <div style={{ color: '#cbd5e1' }}>
            Isolated RedisGraph keyspace: <code style={{ color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: 4 }}>tenant_{t}</code>
          </div>
          <div style={{ color: '#64748b' }}>
            Zero-cross-tenant leakage guarantee. All autonomous agents and Cypher queries are strictly scoped to this isolated tenant graph.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onTenantChange(t)
                setShowTenantAccordion(false)
              }}
              style={{
                padding: '6px 14px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                background: isCurrent ? 'rgba(16, 185, 129, 0.2)' : '#1e2c3f',
                color: isCurrent ? '#34d399' : '#ffffff',
                border: `1px solid ${isCurrent ? '#34d399' : 'rgba(255, 255, 255, 0.1)'}`,
                cursor: 'pointer',
              }}
            >
              {isCurrent ? '✓ Active Tenant Graph' : `Switch to ${t.toUpperCase()}`}
            </button>
          </div>
        </div>
      ),
    }
  })

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

        {/* Global Incident Selector Strip with AnimatedAccordion Flyout */}
        <div className="header-incident-selector-wrap" ref={incidentFlyoutRef}>
          <div
            className="incident-accordion-trigger"
            onClick={() => setShowIncidentAccordion(!showIncidentAccordion)}
            role="button"
            tabIndex={0}
            title="Click to view Animated Accordion of FalkorDB Incidents"
          >
            <span className="incident-selector-label">ACTIVE INCIDENT:</span>
            <div className="incident-trigger-content">
              {selectedIncident ? (
                <span className="incident-trigger-title">
                  <strong>{selectedIncident.id}</strong> — {selectedIncident.title.slice(0, 32)}
                </span>
              ) : (
                <span className="incident-trigger-title">Select Incident</span>
              )}
              {selectedIncident && (
                <span className={`status-pill-mini ${selectedIncident.status === 'open' ? 'open' : 'resolved'}`}>
                  {selectedIncident.status === 'open' ? (
                    <><AlertTriangle size={11} /> OPEN</>
                  ) : (
                    <><CheckCircle2 size={11} /> RESOLVED</>
                  )}
                </span>
              )}
              <ChevronDown size={14} className={`chevron-icon ${showIncidentAccordion ? 'open' : ''}`} />
            </div>
          </div>

          {/* Hidden select for test driver / accessibility */}
          <select
            id="global-incident-select"
            value={selectedIncidentId || ''}
            onChange={(e) => onSelectIncident(e.target.value)}
            className="global-incident-select-sr"
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
          >
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>{inc.id} — {inc.title}</option>
            ))}
          </select>

          {/* Animated Accordion Flyout for Incidents */}
          {showIncidentAccordion && (
            <div className="header-accordion-flyout">
              <div className="flyout-header-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ListFilter size={15} color="#38bdf8" />
                  <strong>Active &amp; Historical Incidents (Animated Accordion)</strong>
                  <span className="counter-chip">({incidents.length})</span>
                </div>
                <button
                  type="button"
                  className="flyout-close-btn"
                  onClick={() => setShowIncidentAccordion(false)}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flyout-body-scroll">
                <AnimatedAccordion
                  items={incidentAccordionItems}
                  accentColor="#38bdf8"
                  type="single"
                  defaultOpenIndex={Math.max(0, incidents.findIndex(i => i.id === selectedIncidentId))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Utility Cluster: Tenant Switcher, Pipeline Actions, Health */}
        <div className="header-action-cluster">
          {/* Tenant Selector with Animated Accordion Flyout */}
          <div className="tenant-selector-pill" ref={tenantFlyoutRef} style={{ position: 'relative' }}>
            <div
              className="tenant-accordion-trigger"
              onClick={() => setShowTenantAccordion(!showTenantAccordion)}
              role="button"
              tabIndex={0}
              title="Click to view Animated Accordion of FalkorDB Tenant Graphs"
            >
              <Database size={13} color="#38bdf8" />
              <span className="tenant-label">TENANT:</span>
              <span className="tenant-current-val">{tenant.toUpperCase()} {tenant === 'acme' ? '(Primary)' : '(Isolated)'}</span>
              <ChevronDown size={13} className={`chevron-icon ${showTenantAccordion ? 'open' : ''}`} />
            </div>

            {/* Hidden select for test driver / accessibility */}
            <select
              value={tenant}
              onChange={(e) => onTenantChange(e.target.value)}
              className="tenant-select-box-sr"
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
            >
              {tenants.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Animated Accordion Flyout for Tenants */}
            {showTenantAccordion && (
              <div className="header-accordion-flyout tenant-flyout">
                <div className="flyout-header-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Database size={15} color="#a855f7" />
                    <strong>FalkorDB Multi-Tenant Graph Partitions</strong>
                  </div>
                  <button
                    type="button"
                    className="flyout-close-btn"
                    onClick={() => setShowTenantAccordion(false)}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flyout-body-scroll">
                  <AnimatedAccordion
                    items={tenantAccordionItems}
                    accentColor="#a855f7"
                    type="single"
                    defaultOpenIndex={Math.max(0, tenants.findIndex(t => t === tenant))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions powered by Framer CTA Action Button */}
          <CTAActionButton
            variant="amber"
            size="sm"
            icon={<Activity size={13} />}
            text={injecting ? 'Injecting...' : 'Inject Demo'}
            onClick={onInject}
            disabled={injecting}
            title="Inject Synthetic Microservice Failure on currency service"
          />

          <CTAActionButton
            variant="primary"
            size="sm"
            icon={<Play size={13} />}
            text={running ? 'Running...' : 'Run Agents'}
            onClick={onRunAgents}
            disabled={running}
            title="Run Multi-Agent Pipeline (Detector -> Analyzer -> Responder)"
          />

          <CTAActionButton
            variant="glass"
            size="sm"
            icon={<RefreshCw size={13} />}
            onClick={onRefresh}
            showArrow={false}
            title="Refresh All Graph Data"
            style={{ padding: '4px 6px' }}
          />

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

      {/* Animated Multi-Agent Neural Bus Ribbon (Framer AnimatedPath) */}
      <div className="header-neural-stream-ribbon">
        <div className="stream-lead-pill">
          <span className="stream-dot-pulse" />
          <span className="stream-lead-label">FalkorDB Multi-Agent Pipeline</span>
        </div>
        <div className="stream-canvas-holder">
          <AnimatedPath
            path={HEADER_STREAM_PATH}
            points={HEADER_STREAM_POINTS}
            viewWidth={1000}
            viewHeight={40}
            lineColor="rgba(56, 189, 248, 0.25)"
            glowColor="#38bdf8"
            dotSize={8}
            speed={135}
            strokeWidth={1.5}
            trailLength={0.35}
            dashLength={7}
            gapLength={7}
            showLabels={true}
          />
        </div>
        <div className="stream-trail-pill">
          <span className="stream-trail-status">Real-time Cypher Graph Traversal</span>
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
