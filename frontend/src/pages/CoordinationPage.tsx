import React from 'react'
import {
  Users, CheckCircle2, Clock, ArrowRight
} from 'lucide-react'
import type { IncidentDetail, PageRoute } from '../types'

interface CoordinationPageProps {
  detail: IncidentDetail | null
  onNavigate: (route: PageRoute) => void
}

export const CoordinationPage: React.FC<CoordinationPageProps> = ({
  detail,
  onNavigate,
}) => {
  if (!detail) {
    return (
      <div className="page-empty-state">
        <Users size={42} className="empty-state-icon" />
        <h3>No Incident Selected</h3>
        <p>Please select an incident to inspect multi-agent task handoffs and coordination logs.</p>
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

  const { incident, tasks } = detail

  // Format relative or formatted timestamp
  function formatTime(timestamp?: number | null) {
    if (!timestamp) return '—'
    return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="page-container coordination-page-container">
      {/* Header Row */}
      <div className="page-header-row">
        <div className="page-title-cluster">
          <div className="page-icon-badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <Users size={20} />
          </div>
          <div>
            <div className="page-breadcrumbs">
              <span onClick={() => onNavigate('overview')} role="button" tabIndex={0}>Incidents</span>
              <span className="crumb-sep">/</span>
              <span>{incident.id}</span>
              <span className="crumb-sep">/</span>
              <span className="active-crumb">Agent Coordination Tasks</span>
            </div>
            <h1 className="page-title">
              Autonomous Agent Pipeline &amp; Task Handoffs
            </h1>
          </div>
        </div>

        <div className="pipeline-summary-pill">
          <span className="summary-dot" />
          <span>Pipeline: Detector &rarr; Analyzer &rarr; Responder &rarr; Learner</span>
        </div>
      </div>

      {/* Agents Architecture Banner */}
      <div className="agent-architecture-cards-grid">
        <div className="agent-role-card">
          <div className="agent-role-top">
            <span className="agent-role-tag detector">DETECTOR</span>
            <span className="agent-step-idx">Stage 1</span>
          </div>
          <h4>Alert Clustering &amp; Deduplication</h4>
          <p>Scans raw firing alerts and groups co-occurring alerts into a unified incident context.</p>
        </div>

        <div className="agent-role-card">
          <div className="agent-role-top">
            <span className="agent-role-tag analyzer">ANALYZER</span>
            <span className="agent-step-idx">Stage 2</span>
          </div>
          <h4>Reverse Dependency Traversal</h4>
          <p>Navigates upstream dependencies to isolate the single root cause service and suspect change.</p>
        </div>

        <div className="agent-role-card">
          <div className="agent-role-top">
            <span className="agent-role-tag responder">RESPONDER</span>
            <span className="agent-step-idx">Stage 3</span>
          </div>
          <h4>Expert Page &amp; Playbook Selection</h4>
          <p>Queries FalkorDB for top incident resolution veterans and evaluates playbook win/loss ratios.</p>
        </div>

        <div className="agent-role-card">
          <div className="agent-role-top">
            <span className="agent-role-tag learner">LEARNER</span>
            <span className="agent-step-idx">Stage 4</span>
          </div>
          <h4>Closed-Loop Knowledge Learning</h4>
          <p>Updates graph weights and empirical Laplace rankings when human operators resolve incidents.</p>
        </div>
      </div>

      {/* Tasks Execution Timeline */}
      <div className="tasks-timeline-section">
        <div className="section-label-bar">
          <span>TASK EXECUTION LOG ({tasks.length} EVENTS)</span>
          <span className="sub-count">Audit trail written to FalkorDB Task nodes</span>
        </div>

        {tasks.length === 0 ? (
          <div className="empty-tasks-box">
            <p>No agent coordination tasks logged for this incident yet.</p>
          </div>
        ) : (
          <div className="tasks-timeline-list">
            {tasks.map((task, idx) => {
              const isFinished = task.status === 'finished' || task.status === 'completed'
              const agentClass = (task.agent || '').toLowerCase()

              return (
                <div key={task.task || idx} className="task-timeline-item">
                  <div className="timeline-marker-column">
                    <div className={`timeline-marker-dot ${isFinished ? 'done' : 'active'}`}>
                      <CheckCircle2 size={14} />
                    </div>
                    {idx < tasks.length - 1 && <div className="timeline-line" />}
                  </div>

                  <div className="task-content-card">
                    <div className="task-header-row">
                      <div className="task-agent-identity">
                        <span className={`task-agent-badge ${agentClass}`}>
                          {task.agent.toUpperCase()}
                        </span>
                        <span className="task-kind-name">{task.kind}</span>
                      </div>

                      <div className="task-meta-time">
                        <Clock size={12} />
                        <span>{formatTime(task.created_at)}</span>
                        {task.finished_at && (
                          <span className="task-duration-pill">
                            {(task.finished_at - task.created_at).toFixed(1)}s
                          </span>
                        )}
                        <span className={`task-status-pill ${task.status}`}>
                          {task.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="task-description-body">
                      <span className="task-id-mono">{task.task}</span>
                      {task.handed_to && (
                        <div className="task-handoff-alert">
                          <ArrowRight size={14} color="#38bdf8" />
                          <span>
                            Handed off to <strong>{task.handed_to.toUpperCase()}</strong>:
                          </span>
                          <span className="handoff-reason-text">"{task.reason}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Next Step Banner */}
      <div className="coordination-footer-banner">
        <div>
          <h3>Inspect Playbook Recommendations</h3>
          <p>See how the Responder agent scored historical playbooks using Laplace smoothing and episodic twins.</p>
        </div>
        <button
          type="button"
          className="banner-action-btn"
          onClick={() => onNavigate('memory')}
        >
          View Memory &amp; Playbooks &rarr;
        </button>
      </div>
    </div>
  )
}
