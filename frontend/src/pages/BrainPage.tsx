import React, { useState } from 'react'
import {
  BrainCircuit, AlertTriangle, Network,
  Search, ExternalLink, Layers
} from 'lucide-react'
import type { KnowledgeView, PageRoute } from '../types'

interface BrainPageProps {
  knowledge: KnowledgeView | null
  tenant: string
  onSelectService: (service: string) => void
  onNavigate: (route: PageRoute) => void
}

export const BrainPage: React.FC<BrainPageProps> = ({
  knowledge,
  tenant,
  onSelectService,
  onNavigate: _onNavigate,
}) => {
  const [filterQuery, setFilterQuery] = useState('')

  const spofList = knowledge?.spof || []
  const dependedList = knowledge?.depended_on || []
  const chokepoints = knowledge?.chokepoints || []

  const filteredSpof = spofList.filter(s => s.service.toLowerCase().includes(filterQuery.toLowerCase()))
  const filteredDepended = dependedList.filter(s => s.service.toLowerCase().includes(filterQuery.toLowerCase()))
  const filteredChokepoints = chokepoints.filter(s => s.service.toLowerCase().includes(filterQuery.toLowerCase()))

  return (
    <div className="page-container brain-page-container">
      {/* Header Row */}
      <div className="page-header-row">
        <div className="page-title-cluster">
          <div className="page-icon-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <BrainCircuit size={20} />
          </div>
          <div>
            <div className="page-breadcrumbs">
              <span>Organization Topology</span>
              <span className="crumb-sep">/</span>
              <span>Tenant: {tenant}</span>
              <span className="crumb-sep">/</span>
              <span className="active-crumb">Company Brain (Track 3)</span>
            </div>
            <h1 className="page-title">
              Topological Knowledge &amp; Centrality Analysis
            </h1>
          </div>
        </div>

        {/* Search / Filter input */}
        <div className="brain-search-input-wrap">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Filter service nodes..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="brain-search-input"
          />
        </div>
      </div>

      {/* Explanatory Banner */}
      <div className="brain-intro-banner">
        <div className="intro-banner-icon">
          <Network size={22} color="#38bdf8" />
        </div>
        <div className="intro-banner-text">
          <h3>FalkorDB Graph Analytics Engine</h3>
          <p>
            Continuous graph analytics identify organizational risk: single points of failure (services dependent on a single engineer), PageRank hubs, and betweenness bottlenecks. Click any service to inspect its live profile and dependency hierarchy.
          </p>
        </div>
      </div>

      {/* 3 Metric Columns Grid */}
      <div className="brain-columns-grid">
        {/* Col 1: Knowledge SPOF */}
        <div className="brain-column-card spof-column">
          <div className="brain-col-header">
            <div className="col-header-left">
              <AlertTriangle size={16} color="#ef4444" />
              <h3>KNOWLEDGE SPOFs</h3>
            </div>
            <span className="col-count-badge red">{filteredSpof.length} Found</span>
          </div>
          <p className="col-subtext">Services with critical incident exposure known by &le; 1 expert.</p>

          <div className="service-tiles-stack">
            {filteredSpof.length === 0 ? (
              <p className="empty-subtext">No single points of failure detected in active graph.</p>
            ) : (
              filteredSpof.map((item) => (
                <div
                  key={item.service}
                  className="brain-service-item clickable"
                  onClick={() => onSelectService(item.service)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="service-item-main">
                    <strong className="service-name-text">{item.service}</strong>
                    <span className="tier-tag">Tier {item.tier}</span>
                  </div>
                  <div className="service-item-metric danger">
                    <span>{item.people_who_fixed_it} fixer{item.people_who_fixed_it === 1 ? '' : 's'}</span>
                    <ExternalLink size={12} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Col 2: High Dependency (PageRank Hubs) */}
        <div className="brain-column-card depended-column">
          <div className="brain-col-header">
            <div className="col-header-left">
              <Layers size={16} color="#38bdf8" />
              <h3>MOST DEPENDED-ON</h3>
            </div>
            <span className="col-count-badge blue">{filteredDepended.length} Hubs</span>
          </div>
          <p className="col-subtext">Core infrastructural dependencies with highest incoming graph edges.</p>

          <div className="service-tiles-stack">
            {filteredDepended.length === 0 ? (
              <p className="empty-subtext">No dependency hubs loaded.</p>
            ) : (
              filteredDepended.map((item) => (
                <div
                  key={item.service}
                  className="brain-service-item clickable"
                  onClick={() => onSelectService(item.service)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="service-item-main">
                    <strong className="service-name-text">{item.service}</strong>
                  </div>
                  <div className="service-item-metric blue">
                    <span>Score {item.score}</span>
                    <ExternalLink size={12} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Col 3: Architectural Chokepoints */}
        <div className="brain-column-card chokepoint-column">
          <div className="brain-col-header">
            <div className="col-header-left">
              <Network size={16} color="#a855f7" />
              <h3>CHOKEPOINTS</h3>
            </div>
            <span className="col-count-badge purple">{filteredChokepoints.length} Nodes</span>
          </div>
          <p className="col-subtext">Nodes lying on the shortest graph paths between disparate service clusters.</p>

          <div className="service-tiles-stack">
            {filteredChokepoints.length === 0 ? (
              <p className="empty-subtext">No chokepoints found.</p>
            ) : (
              filteredChokepoints.map((item) => (
                <div
                  key={item.service}
                  className="brain-service-item clickable"
                  onClick={() => onSelectService(item.service)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="service-item-main">
                    <strong className="service-name-text">{item.service}</strong>
                  </div>
                  <div className="service-item-metric purple">
                    <span>Betweenness {item.score}</span>
                    <ExternalLink size={12} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
