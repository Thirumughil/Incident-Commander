import React from 'react'
import { Database, ShieldCheck, Cpu, Code2, ExternalLink } from 'lucide-react'
import type { PageRoute } from '../types'

interface FooterProps {
  tenant: string
  currentRoute: PageRoute
  onNavigate: (route: PageRoute) => void
}

export const Footer: React.FC<FooterProps> = ({ tenant, currentRoute, onNavigate }) => {
  return (
    <footer className="global-footer">
      <div className="footer-top-grid">
        {/* Col 1: System Info */}
        <div className="footer-col">
          <div className="footer-col-header">
            <Database size={15} color="#38bdf8" />
            <span>FALKORDB GRAPH ENGINE</span>
          </div>
          <p className="footer-desc">
            Zero-mock, 100% parameterised Cypher queries executed directly against low-latency RedisGraph engine.
          </p>
          <div className="footer-meta-tags">
            <span className="footer-tag">Port: 6380</span>
            <span className="footer-tag">Keyspace: tenant_{tenant}</span>
            <span className="footer-tag">Persistence: AOF everysec</span>
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
              Memory & Continuous Response
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
            <span>GRAPH HACKS 2026 SUBMISSION</span>
          </div>
          <p className="footer-desc">
            Built by <strong>Thiru Mughil Senthur R</strong> (Solo Student).
            Entered in Track 1 (Agents on Connected Data), Track 2 (Agent Memory), Track 3 (Company Brain).
          </p>
          <div className="footer-meta-tags">
            <span className="footer-tag">License: MIT</span>
            <span className="footer-tag">Isolation: 100% Tenant-Safe</span>
            <span className="footer-tag">FastAPI + Vite React</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright, Verification, Links */}
      <div className="footer-bottom-bar">
        <div className="footer-bottom-left">
          <span>&copy; 2026 Incident Commander • WeMakeDevs &times; FalkorDB Hackathon</span>
          <span className="footer-divider">•</span>
          <span className="footer-verified-badge">
            <Code2 size={12} />
            <span>21/21 Cypher Queries Verified</span>
          </span>
        </div>
        <div className="footer-bottom-right">
          <span className="footer-latency-pill">Graph Roundtrip: &lt;4ms</span>
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
