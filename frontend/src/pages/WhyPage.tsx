import React, { useState } from 'react'
import {
  Sparkles, ShieldCheck, Copy, Check, Terminal,
  ChevronRight, Layers
} from 'lucide-react'
import type { IncidentDetail, PageRoute } from '../types'

interface WhyPageProps {
  detail: IncidentDetail | null
  onNavigate: (route: PageRoute) => void
  onSelectService: (service: string) => void
}

export const WhyPage: React.FC<WhyPageProps> = ({
  detail,
  onNavigate,
  onSelectService,
}) => {
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null)

  if (!detail) {
    return (
      <div className="page-empty-state">
        <Sparkles size={42} className="empty-state-icon" />
        <h3>No Incident Selected</h3>
        <p>Please select an incident to inspect the "Why?" evidence and Cypher query audit trail.</p>
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

  const { incident, findings, graph } = detail

  function handleCopy(query: string, id: string) {
    navigator.clipboard.writeText(query)
    setCopiedQueryId(id)
    setTimeout(() => setCopiedQueryId(null), 2000)
  }

  return (
    <div className="page-container why-page-container">
      {/* Header Row */}
      <div className="page-header-row">
        <div className="page-title-cluster">
          <div className="page-icon-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div className="page-breadcrumbs">
              <span onClick={() => onNavigate('overview')} role="button" tabIndex={0}>Incidents</span>
              <span className="crumb-sep">/</span>
              <span>{incident.id}</span>
              <span className="crumb-sep">/</span>
              <span className="active-crumb">"Why?" Evidence Panel</span>
            </div>
            <h1 className="page-title">
              Audit Findings &amp; FalkorDB Graph Evidence
            </h1>
          </div>
        </div>

        <div className="why-guarantee-badge">
          <ShieldCheck size={16} color="#10b981" />
          <div>
            <strong>100% Graph-Grounded Audit</strong>
            <span>Zero hallucinated conclusions — every claim backed by verified Cypher queries</span>
          </div>
        </div>
      </div>

      {/* Main Evidence Content */}
      <div className="why-content-layout">
        <div className="findings-stream-column">
          <div className="section-label-bar">
            <span>DISCOVERED FINDINGS ({findings.length})</span>
            <span className="sub-count">Grounded in FalkorDB Topology</span>
          </div>

          {findings.length === 0 ? (
            <div className="empty-findings-box">
              <p>No formal findings emitted yet for this incident.</p>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => onNavigate('overview')}
              >
                Trigger Agent Analysis &rarr;
              </button>
            </div>
          ) : (
            findings.map((f, idx) => {
              const confidencePct = Math.round(f.confidence * 100)
              const isCopied = copiedQueryId === f.id

              return (
                <div key={f.id || idx} className="finding-audit-card">
                  <div className="finding-card-header">
                    <div className="finding-agent-badge">
                      <span className="agent-tag-dot" />
                      <span>{f.agent.toUpperCase()} AGENT</span>
                    </div>

                    <div className="confidence-pill-wrap">
                      <span className="confidence-label">CONFIDENCE:</span>
                      <div className="confidence-meter-bar">
                        <div
                          className="confidence-meter-fill"
                          style={{
                            width: `${confidencePct}%`,
                            background: confidencePct >= 90 ? '#10b981' : confidencePct >= 70 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                      <span className="confidence-value">{confidencePct}%</span>
                    </div>
                  </div>

                  {/* Claim Text */}
                  <div className="finding-claim-statement">
                    <h3>{f.claim}</h3>
                  </div>

                  {/* Evidence Pills */}
                  {f.evidence && Object.keys(f.evidence).length > 0 && (
                    <div className="evidence-pills-row">
                      <span className="evidence-meta-title">GRAPH EVIDENCE:</span>
                      {Object.entries(f.evidence).map(([key, items]) => (
                        <div key={key} className="evidence-group-pill">
                          <span className="evidence-key">{key}:</span>
                          <span className="evidence-values">
                            {Array.isArray(items) ? items.join(', ') : String(items)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cypher Query Inspector */}
                  {f.query && (
                    <div className="cypher-query-box">
                      <div className="query-box-header">
                        <div className="query-box-title">
                          <Terminal size={13} color="#94a3b8" />
                          <span>FALKORDB CYPHER QUERY</span>
                        </div>
                        <button
                          type="button"
                          className="copy-query-btn"
                          onClick={() => handleCopy(f.query, f.id)}
                          title="Copy Cypher Query to Clipboard"
                        >
                          {isCopied ? (
                            <>
                              <Check size={12} color="#10b981" />
                              <span style={{ color: '#10b981' }}>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy Cypher</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="cypher-code-block">
                        <code>{f.query}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Sidebar / Auxiliary Card */}
        <aside className="why-sidebar-column">
          <div className="why-insight-card">
            <h3>Root Cause Localization</h3>
            <p>
              The Analyzer agent traversed the reverse dependency graph from alerted services to find upstream convergence on{' '}
              <strong>{graph.origin || 'unknown'}</strong>.
            </p>
            {graph.origin && (
              <button
                type="button"
                className="view-service-profile-btn"
                onClick={() => onSelectService(graph.origin!)}
              >
                Inspect {graph.origin} Profile &rarr;
              </button>
            )}
          </div>

          <div className="why-insight-card">
            <h3>Suspect Change Correlation</h3>
            {graph.change ? (
              <div>
                <p style={{ marginBottom: 8 }}>
                  Change <strong>{graph.change.change}</strong> ({graph.change.kind}) was deployed directly prior to alert fires:
                </p>
                <div className="change-quote-box">
                  "{graph.change.summary}"
                </div>
              </div>
            ) : (
              <p>No recent code deployment or schema migration correlated with this incident.</p>
            )}
          </div>

          <div className="why-insight-card">
            <h3>Quick Actions</h3>
            <div className="aux-actions-stack">
              <button
                type="button"
                className="aux-action-btn"
                onClick={() => onNavigate('graph')}
              >
                <Layers size={14} />
                <span>View Progressive 3D Graph</span>
              </button>
              <button
                type="button"
                className="aux-action-btn"
                onClick={() => onNavigate('coordination')}
              >
                <ChevronRight size={14} />
                <span>View Agent Execution Log</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
