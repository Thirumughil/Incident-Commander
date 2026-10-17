import React from 'react'
import { X, Layers, Users, History } from 'lucide-react'
import type { ServiceProfile } from '../types'

interface ServiceProfileDrawerProps {
  selectedService: string | null
  serviceProfile: ServiceProfile | null
  loadingService: boolean
  onClose: () => void
  onSelectService: (service: string) => void
}

export const ServiceProfileDrawer: React.FC<ServiceProfileDrawerProps> = ({
  selectedService,
  serviceProfile,
  loadingService,
  onClose,
  onSelectService,
}) => {
  if (!selectedService) return null

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className="drawer-tag">FALKORDB GRAPH SERVICE PROFILE</span>
            <h2>{selectedService}</h2>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose} title="Close drawer">
            <X size={18} />
          </button>
        </div>

        {loadingService ? (
          <div className="drawer-loading-state">
            <div className="loading-spinner" />
            <p>Querying FalkorDB topology for {selectedService}...</p>
          </div>
        ) : serviceProfile ? (
          <div className="drawer-body">
            {/* Metadata Grid */}
            <div className="drawer-meta-grid">
              <div className="drawer-meta-box">
                <span>TIER</span>
                <strong>Tier {serviceProfile.info.tier}</strong>
              </div>
              <div className="drawer-meta-box">
                <span>OWNING TEAM</span>
                <strong>{serviceProfile.info.team}</strong>
              </div>
              <div className="drawer-meta-box">
                <span>SLO BUDGET</span>
                <strong>{serviceProfile.info.slo_ms} ms</strong>
              </div>
              <div className="drawer-meta-box">
                <span>SLACK CHANNEL</span>
                <strong>{serviceProfile.info.channel}</strong>
              </div>
            </div>

            {/* Graph Neighbors: Dependencies */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <Layers size={14} color="#38bdf8" />
                <span>UPSTREAM DEPENDENCIES ({serviceProfile.neighbors.depends_on.length})</span>
              </div>
              <p className="drawer-section-sub">Services that {selectedService} relies on via (Service)-[:DEPENDS_ON]-&gt;(Service)</p>
              <div className="dependency-badges-wrap">
                {serviceProfile.neighbors.depends_on.length === 0 ? (
                  <span className="empty-inline-hint">Leaf node: No downstream dependencies.</span>
                ) : (
                  serviceProfile.neighbors.depends_on.map((dep) => (
                    <button
                      key={dep}
                      type="button"
                      className="dependency-badge"
                      onClick={() => onSelectService(dep)}
                      title={`Inspect ${dep}`}
                    >
                      {dep} &rarr;
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Graph Neighbors: Dependents */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <Layers size={14} color="#a855f7" />
                <span>DOWNSTREAM DEPENDENTS ({serviceProfile.neighbors.dependents.length})</span>
              </div>
              <p className="drawer-section-sub">Services that will be impacted if {selectedService} degrades</p>
              <div className="dependency-badges-wrap">
                {serviceProfile.neighbors.dependents.length === 0 ? (
                  <span className="empty-inline-hint">Root service: No upstream dependents.</span>
                ) : (
                  serviceProfile.neighbors.dependents.map((dep) => (
                    <button
                      key={dep}
                      type="button"
                      className="dependency-badge"
                      onClick={() => onSelectService(dep)}
                      title={`Inspect ${dep}`}
                    >
                      &larr; {dep}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Historical Experts */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <Users size={14} color="#10b981" />
                <span>KNOWLEDGE EXPERTS ({serviceProfile.experts.length})</span>
              </div>
              <p className="drawer-section-sub">Engineers who have resolved prior incidents on {selectedService}</p>
              <div className="experts-list">
                {serviceProfile.experts.length === 0 ? (
                  <span className="empty-inline-hint">No prior resolutions recorded yet in graph.</span>
                ) : (
                  serviceProfile.experts.map((exp) => (
                    <div key={exp.person} className="expert-item-card">
                      <div className="expert-item-avatar">{exp.person.slice(0, 2).toUpperCase()}</div>
                      <div className="expert-item-details">
                        <span className="expert-name">{exp.person}</span>
                        <span className="expert-role">{exp.role}</span>
                      </div>
                      <div className="expert-item-stats">
                        <span className="stat-number">{exp.incidents}</span>
                        <span className="stat-label">fixes (avg {exp.avg_minutes}m)</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Prior Incidents */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <History size={14} color="#f59e0b" />
                <span>PAST INCIDENTS ({serviceProfile.incidents.length})</span>
              </div>
              <div className="past-incidents-list">
                {serviceProfile.incidents.length === 0 ? (
                  <span className="empty-inline-hint">No historical incidents recorded.</span>
                ) : (
                  serviceProfile.incidents.map((pi) => (
                    <div key={pi.id} className="past-incident-chip-row">
                      <span className="incident-chip-id">{pi.id}</span>
                      <span className="incident-chip-title">{pi.title}</span>
                      <span className="incident-chip-role">{pi.role}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  )
}
