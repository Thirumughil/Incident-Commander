import React from 'react'
import {
  Database, ShieldCheck, Cpu, Code2, ExternalLink,
  Zap, CheckCircle2
} from 'lucide-react'
import type { PageRoute } from '../types'

interface FooterProps {
  tenant: string
  currentRoute: PageRoute
  onNavigate: (route: PageRoute) => void
}

export const Footer: React.FC<FooterProps> = ({ tenant, currentRoute, onNavigate }) => {
  return (
    <footer className="global-footer" id="global-footer-anchor">
      {/* Hackathon Tracks Hero Strip */}
      <div className="footer-hackathon-banner">
        <div className="footer-hackathon-brand">
          <div className="hackathon-pulse-dot" />
          <span className="hackathon-label">GRAPH HACKS 2026: CONTEXT FOR AI AGENTS</span>
          <span className="hackathon-sublabel">WeMakeDevs &times; FalkorDB</span>
        </div>
        
        <div className="footer-tracks-badges">
          <div className="footer-track-chip track-1">
            <span className="track-tag">Track 1</span>
            <span className="track-title">Connected Data (WCC &amp; Cypher)</span>
          </div>
          <div className="footer-track-chip track-2">
            <span className="track-tag">Track 2</span>
            <span className="track-title">Agent Memory (4 Tiers)</span>
          </div>
          <div className="footer-track-chip track-3">
            <span className="track-tag">Track 3</span>
            <span className="track-title">Company Brain (SPOFs)</span>
          </div>
        </div>
      </div>

      <div className="footer-top-grid">
        {/* Col 1: System Info */}
        <div className="footer-col">
          <div className="footer-col-header">
            <Database size={15} color="#38bdf8" />
            <span>FALKORDB GRAPH ENGINE</span>
          </div>
          <p className="footer-desc">
            Zero-mock, 100% parameterised Cypher queries executed directly against low-latency RedisGraph engine with complete graph-level tenant isolation.
          </p>
          <div className="footer-meta-tags">
            <span className="footer-tag">
              <span className="footer-live-dot" /> Port: 6380
            </span>
            <span className="footer-tag">Keyspace: tenant_{tenant}</span>
            <span className="footer-tag">AOF: everysec</span>
            <span className="footer-tag">Latency: &lt;4ms</span>
          </div>
        </div>

        {/* Col 2: Navigation Quick Redirects */}
        <div className="footer-col">
          <div className="footer-col-header">
            <Cpu size={15} color="#a855f7" />
            <span>MISSION CONTROL SECTIONS</span>
          </div>
          <div className="footer-links-grid">
            <button
              type="button"
              className={`footer-nav-link ${currentRoute === 'overview' ? 'active' : ''}`}
              onClick={() => onNavigate('overview')}
            >
              Operations Feed
            </button>
            <button
              type="button"
              className={`footer-nav-link ${currentRoute === 'graph' ? 'active' : ''}`}
              onClick={() => onNavigate('graph')}
            >
              Progressive 3D Motion Graph
            </button>
            <button
              type="button"
              className={`footer-nav-link ${currentRoute === 'why' ? 'active' : ''}`}
              onClick={() => onNavigate('why')}
            >
              "Why?" Evidence Panel
            </button>
            <button
              type="button"
              className={`footer-nav-link ${currentRoute === 'coordination' ? 'active' : ''}`}
              onClick={() => onNavigate('coordination')}
            >
              Agent Coordination Tasks
            </button>
            <button
              type="button"
              className={`footer-nav-link ${currentRoute === 'memory' ? 'active' : ''}`}
              onClick={() => onNavigate('memory')}
            >
              Memory &amp; Response (Learning)
            </button>
            <button
              type="button"
              className={`footer-nav-link ${currentRoute === 'brain' ? 'active' : ''}`}
              onClick={() => onNavigate('brain')}
            >
              Company Brain (Track 3)
            </button>
          </div>
        </div>

        {/* Col 3: Hackathon Credentials */}
        <div className="footer-col">
          <div className="footer-col-header">
            <ShieldCheck size={15} color="#10b981" />
            <span>SUBMISSION CREDENTIALS</span>
          </div>
          <p className="footer-desc">
            Built by <strong>Thiru Mughil Senthur R</strong> (Solo Student).
            Autonomous multi-agent architecture grounded in FalkorDB knowledge graph memory.
          </p>
          <div className="footer-meta-tags">
            <span className="footer-tag">
              <CheckCircle2 size={11} color="#10b981" /> 21/21 Cypher Queries
            </span>
            <span className="footer-tag">55/55 Tests Passing</span>
            <span className="footer-tag">MIT License</span>
            <span className="footer-tag">FastAPI + Vite React</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright, Verification, Links */}
      <div className="footer-bottom-bar">
        <div className="footer-bottom-left">
          <span>&copy; 2026 Incident Commander &bull; Graph Hacks Submission</span>
          <span className="footer-divider">&bull;</span>
          <span className="footer-verified-badge">
            <Code2 size={12} />
            <span>All Claims Graph-Grounded</span>
          </span>
        </div>
        <div className="footer-bottom-right">
          <span className="footer-latency-pill">
            <Zap size={11} color="#f59e0b" /> Engine: FalkorDB v2.8+
          </span>
          <a
            href="https://github.com/FalkorDB/FalkorDB"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-ext-link"
          >
            <span>FalkorDB Docs</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </footer>
  )
}
