import React from 'react'
import {
  Layers, CheckCircle2, TrendingUp, Sparkles, BookOpen,
  ShieldCheck, Check, UserCheck
} from 'lucide-react'
import type { IncidentDetail, PageRoute } from '../types'
import { CTAActionButton } from '../components/CTAActionButton'

interface MemoryPageProps {
  detail: IncidentDetail | null
  onNavigate: (route: PageRoute) => void
  resolvePlaybook: string
  setResolvePlaybook: (v: string) => void
  resolveWorked: boolean
  setResolveWorked: (v: boolean) => void
  resolveMinutes: number
  setResolveMinutes: (v: number) => void
  resolvePerson: string
  setResolvePerson: (v: string) => void
  onResolve: (e: React.FormEvent) => void
  resolving: boolean
  learningResult: {
    playbook: string
    worked: boolean
    before: number
    after: number
  } | null
}

export const MemoryPage: React.FC<MemoryPageProps> = ({
  detail,
  onNavigate,
  resolvePlaybook,
  setResolvePlaybook,
  resolveWorked,
  setResolveWorked,
  resolveMinutes,
  setResolveMinutes,
  resolvePerson,
  setResolvePerson,
  onResolve,
  resolving,
  learningResult,
}) => {
  if (!detail) {
    return (
      <div className="page-empty-state">
        <Layers size={42} className="empty-state-icon" />
        <h3>No Incident Selected</h3>
        <p>Please select an incident to inspect memory rankings, similar incident twins, and closed-loop resolution.</p>
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

  const { incident, memory, page, outcome } = detail
  const playbooks = memory.playbooks || []
  const similar = memory.similar || []
  const isResolved = incident.status === 'resolved'

  return (
    <div className="page-container memory-page-container">
      {/* Header Row */}
      <div className="page-header-row">
        <div className="page-title-cluster">
          <div className="page-icon-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Layers size={20} />
          </div>
          <div>
            <div className="page-breadcrumbs">
              <span onClick={() => onNavigate('overview')} role="button" tabIndex={0}>Incidents</span>
              <span className="crumb-sep">/</span>
              <span>{incident.id}</span>
              <span className="crumb-sep">/</span>
              <span className="active-crumb">Memory &amp; Continuous Learning</span>
            </div>
            <h1 className="page-title">
              Agent Memory, Playbook Scoring &amp; Operator Feedback
            </h1>
          </div>
        </div>

        <div className="laplace-math-pill" title="Laplace Bayesian Prior smoothing formula">
          <TrendingUp size={14} color="#10b981" />
          <span>Formula: (Wins + 1) / (Wins + Losses + 2) + Similar Boost</span>
        </div>
      </div>

      {/* Paged Expert Hero Card */}
      {page && (
        <div className="paged-hero-card">
          <div className="paged-hero-avatar">
            <UserCheck size={24} color="#38bdf8" />
          </div>
          <div className="paged-hero-info">
            <span className="paged-hero-tag">DISPATCHED ON-CALL EXPERT (RESPONDER AGENT)</span>
            <h3>{page.person} &bull; {page.role}</h3>
            <p>
              Team: <strong>{page.team}</strong> &bull; Slack: <code>{page.channel}</code> &bull; Historical Incident Fixes: <strong>{page.prior_fixes}</strong>
            </p>
          </div>
          {incident.recommended_playbook && (
            <div className="paged-hero-recommendation">
              <span className="rec-badge-label">RECOMMENDED PLAYBOOK</span>
              <strong className="rec-badge-value">{incident.recommended_playbook}</strong>
            </div>
          )}
        </div>
      )}

      {/* Live Learning Result Notice (if just resolved) */}
      {learningResult && (
        <div className="learning-success-banner">
          <CheckCircle2 size={18} color="#10b981" />
          <div className="learning-success-text">
            <h4>Closed-Loop Knowledge Graph Update Successful!</h4>
            <p>
              Playbook <strong>{learningResult.playbook}</strong> ({learningResult.worked ? 'Worked' : 'Failed'}):
              Empirical score adjusted from <code>{learningResult.before.toFixed(3)}</code> &rarr;{' '}
              <strong style={{ color: '#10b981' }}>{learningResult.after.toFixed(3)}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Two Column Layout: Playbooks Table + Resolution Form */}
      <div className="memory-main-grid">
        {/* Left Column: Playbook Rankings Table & Episodic Twins */}
        <div className="memory-rankings-column">
          {/* Section 1: Playbooks */}
          <div className="memory-card">
            <div className="memory-card-header">
              <BookOpen size={16} color="#38bdf8" />
              <span>LAPLACE-SMOOTHED PLAYBOOK RANKINGS</span>
            </div>

            <div className="table-responsive-wrapper">
              <table className="playbook-ranking-table">
                <thead>
                  <tr>
                    <th>Playbook ID</th>
                    <th>Name</th>
                    <th style={{ textAlign: 'center' }}>W / L</th>
                    <th style={{ textAlign: 'right' }}>Base Score</th>
                    <th style={{ textAlign: 'right' }}>Twin Boost</th>
                    <th style={{ textAlign: 'right' }}>Final Score</th>
                    <th style={{ textAlign: 'center' }}>Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {playbooks.map((pb) => {
                    const isRec = pb.recommended || pb.playbook_id === incident.recommended_playbook
                    return (
                      <tr key={pb.playbook_id} className={isRec ? 'recommended-row' : ''}>
                        <td className="mono-cell">{pb.playbook_id}</td>
                        <td className="name-cell">{pb.name}</td>
                        <td className="stat-cell" style={{ textAlign: 'center' }}>
                          <span className="win-count">{pb.wins}W</span> / <span className="loss-count">{pb.losses}L</span>
                        </td>
                        <td className="num-cell" style={{ textAlign: 'right' }}>
                          {pb.score.toFixed(3)}
                        </td>
                        <td className="num-cell" style={{ textAlign: 'right', color: pb.boost ? '#f59e0b' : '#64748b' }}>
                          {pb.boost ? `+${pb.boost.toFixed(2)}` : '—'}
                        </td>
                        <td className="num-cell final-score" style={{ textAlign: 'right' }}>
                          <strong>{(pb.final ?? pb.score).toFixed(3)}</strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isRec ? (
                            <span className="recommended-pill">
                              <Sparkles size={11} /> Top Pick
                            </span>
                          ) : (
                            <span className="alt-pill">Alternative</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Episodic Memory Twins */}
          <div className="memory-card" style={{ marginTop: 20 }}>
            <div className="memory-card-header">
              <TrendingUp size={16} color="#a855f7" />
              <span>EPISODIC MEMORY: PAST SIMILAR INCIDENT TWINS</span>
            </div>

            {similar.length === 0 ? (
              <p className="empty-subtext">No historical twin incidents found with overlapping graph topologies.</p>
            ) : (
              <div className="similar-twins-list">
                {similar.map((twin) => (
                  <div key={twin.incident} className="twin-item-card">
                    <div className="twin-item-left">
                      <div className="twin-id-row">
                        <span className="twin-id">{twin.incident}</span>
                        <span className="twin-overlap-badge">
                          {Math.round(twin.overlap * 100)}% Topology Overlap
                        </span>
                      </div>
                      <h4 className="twin-title">{twin.title}</h4>
                      <p className="twin-sub">
                        Triggered by change: {twin.change_caused ? 'Yes' : 'No'} &bull; Prior Resolution Time: {twin.minutes} min
                      </p>
                    </div>

                    <div className="twin-item-right">
                      <span className="twin-used-label">Playbook Used:</span>
                      <strong className="twin-pb-name">{twin.playbook_id}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Feedback / Resolution Form */}
        <div className="memory-resolution-column">
          <div className="resolution-form-card">
            <div className="resolution-form-header">
              <ShieldCheck size={18} color="#10b981" />
              <div>
                <h3>Simulate Operator Feedback</h3>
                <span>Provide closed-loop feedback to train agent weights in FalkorDB</span>
              </div>
            </div>

            {isResolved && outcome ? (
              <div className="already-resolved-box">
                <div className="resolved-check-icon">
                  <CheckCircle2 size={28} color="#10b981" />
                </div>
                <h4>Incident Resolved</h4>
                <p>
                  Resolved by <strong>{outcome.resolver || 'Operator'}</strong> in{' '}
                  <strong>{outcome.minutes || 15} minutes</strong> using{' '}
                  <strong>{outcome.playbook || 'Standard Playbook'}</strong>.
                </p>
                <div className="worked-badge-pill">
                  {outcome.worked ? 'Outcome: Effective (Worked)' : 'Outcome: Ineffective'}
                </div>
              </div>
            ) : (
              <form onSubmit={onResolve} className="resolve-action-form">
                <div className="form-group">
                  <label htmlFor="playbook-select">Executed Playbook:</label>
                  <select
                    id="playbook-select"
                    value={resolvePlaybook}
                    onChange={(e) => setResolvePlaybook(e.target.value)}
                    className="form-control"
                    required
                  >
                    <option value="">-- Choose a playbook --</option>
                    {playbooks.map((pb) => (
                      <option key={pb.playbook_id} value={pb.playbook_id}>
                        {pb.playbook_id} — {pb.name} (Score: {(pb.final ?? pb.score).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Playbook Outcome:</label>
                  <div className="radio-pill-group">
                    <button
                      type="button"
                      className={`radio-pill-btn ${resolveWorked ? 'active' : ''}`}
                      onClick={() => setResolveWorked(true)}
                    >
                      <Check size={14} />
                      <span>Worked (+1 Win)</span>
                    </button>
                    <button
                      type="button"
                      className={`radio-pill-btn ${!resolveWorked ? 'active-loss' : ''}`}
                      onClick={() => setResolveWorked(false)}
                    >
                      <span>Failed (+1 Loss)</span>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="resolve-minutes">Time to Resolve (minutes):</label>
                  <input
                    id="resolve-minutes"
                    type="number"
                    min="1"
                    max="1440"
                    value={resolveMinutes}
                    onChange={(e) => setResolveMinutes(Number(e.target.value))}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="resolver-name">Resolving Engineer:</label>
                  <input
                    id="resolver-name"
                    type="text"
                    value={resolvePerson}
                    onChange={(e) => setResolvePerson(e.target.value)}
                    className="form-control"
                    placeholder="e.g. Priya Raman"
                    required
                  />
                </div>

                <CTAActionButton
                  type="submit"
                  variant="success"
                  size="md"
                  icon={<CheckCircle2 size={16} />}
                  text={resolving ? 'Recording Closed-Loop Learning...' : 'Submit Resolution Feedback'}
                  disabled={resolving || !resolvePlaybook}
                  className="submit-resolve-btn"
                  style={{ width: '100%', marginTop: 8 }}
                />
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
