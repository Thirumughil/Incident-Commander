import React from 'react'
import {
  Network, AlertTriangle, GitCommit, Layers, Eye,
  ExternalLink, Zap
} from 'lucide-react'
import { Graph3D } from '../components/Graph3D'
import type { IncidentDetail, PageRoute } from '../types'

interface GraphPageProps {
  detail: IncidentDetail | null
  onSelectService: (service: string) => void
  onNavigate: (route: PageRoute) => void
  liteMode?: boolean
}

export const GraphPage: React.FC<GraphPageProps> = ({
  detail,
  onSelectService,
  onNavigate,
  liteMode = false,
}) => {
  if (!detail) {
    return (
      <div className="page-empty-state">
        <Network size={42} className="empty-state-icon" />
        <h3>No Incident Selected</h3>
        <p>Please select an incident from the header dropdown or the Operations Feed to inspect its graph topology.</p>
        <button
          type="button"
          className="empty-action-btn"
          onClick={() => onNavigate('overview')}
        >
          Go to Operations Feed
        </button>
      </div>
    )
  }

  const { incident, graph, alerting } = detail
  const nodeCount = graph.nodes.length
  const edgeCount = graph.edges.length

  return (
    <div className="page-container graph-page-container">
      {/* Page Header Strip */}
      <div className="page-header-row">
        <div className="page-title-cluster">
          <div className="page-icon-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <Network size={20} />
          </div>
          <div>
            <div className="page-breadcrumbs">
              <span onClick={() => onNavigate('overview')} role="button" tabIndex={0}>Incidents</span>
              <span className="crumb-sep">/</span>
              <span>{incident.id}</span>
              <span className="crumb-sep">/</span>
              <span className="active-crumb">Progressive 3D Motion Graph</span>
            </div>
            <h1 className="page-title">
              {incident.id} Topology &amp; Blast Radius
            </h1>
          </div>
        </div>

        {/* Quick Context Chips */}
        <div className="page-header-chips">
          <div className="context-chip origin">
            <span className="chip-label">ORIGIN:</span>
            <strong>{graph.origin || 'Unknown'}</strong>
          </div>
          {graph.change && (
            <div className="context-chip change">
              <GitCommit size={13} />
              <span className="chip-label">SUSPECT CHANGE:</span>
              <strong>{graph.change.change}</strong>
            </div>
          )}
          <div className="context-chip alert">
            <AlertTriangle size={13} />
            <span className="chip-label">FIRING ALERTS:</span>
            <strong>{alerting.length}</strong>
          </div>
          <div className="context-chip radius">
            <Layers size={13} />
            <span className="chip-label">BLAST RADIUS:</span>
            <strong>{nodeCount} services / {edgeCount} edges</strong>
          </div>
        </div>
      </div>

      {/* Single-Service Incident Callout */}
      {nodeCount === 1 && (
        <div style={{
          margin: '0 0 12px 0',
          padding: '10px 16px',
          borderRadius: '8px',
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          color: '#bae6fd',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Zap size={15} color="#38bdf8" />
          <span>
            <strong>Isolated Root Cause ({graph.origin}):</strong> This service has no downstream dependents in FalkorDB topology (hops = 0). The alert fired directly on origin with zero cascading blast impact.
          </span>
        </div>
      )}

      {/* Main 3D Topology Viewport */}
      <div className="graph-stage-wrapper">
        <Graph3D
          detail={detail}
          onSelectService={onSelectService}
          liteMode={liteMode}
        />
      </div>

      {/* Under-Graph Context & Quick Navigation Strip */}
      <div className="graph-footer-context-grid">
        <div className="context-card">
          <div className="context-card-header">
            <Zap size={15} color="#f59e0b" />
            <span>HOW PROGRESSIVE 3D MOTION WORKS</span>
          </div>
          <p>
            Nodes smoothly bloom outwards from the origin using spherical coordinates. Edge photons pulse in real-time along FalkorDB dependency vectors, highlighting the exact causal blast trajectory.
          </p>
        </div>

        <div className="context-card">
          <div className="context-card-header">
            <Eye size={15} color="#38bdf8" />
            <span>INTERACTIVE INVESTIGATION</span>
          </div>
          <p>
            Click any service sphere (e.g. <code>frontend</code>, <code>payment</code>, <code>cart</code>) to open the FalkorDB Service Profile drawer with dependency trees, owners, and experts.
          </p>
        </div>

        <div className="context-card">
          <div className="context-card-header">
            <ExternalLink size={15} color="#10b981" />
            <span>NEXT STEPS IN AUDIT</span>
          </div>
          <div className="quick-nav-actions">
            <button
              type="button"
              className="quick-action-pill"
              onClick={() => onNavigate('why')}
            >
              Inspect "Why?" Cypher Queries &rarr;
            </button>
            <button
              type="button"
              className="quick-action-pill"
              onClick={() => onNavigate('memory')}
            >
              View Recommended Playbooks &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
