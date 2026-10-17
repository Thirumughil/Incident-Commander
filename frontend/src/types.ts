export interface IncidentSummary {
  id: string
  title: string
  status: 'open' | 'resolved' | string
  severity: string
  started_at: number
  resolved_at?: number | null
  recommended_playbook?: string | null
  paged?: string | null
  origin?: string | null
}

export interface GraphNode {
  id: string
  tier?: number
  hops?: number
  alerting?: boolean
  severity?: string
}

export interface GraphEdge {
  source: string
  target: string
  kind?: string
  criticality?: string
}

export interface GraphCause {
  change: string
  kind: string
  summary: string
  at: number
}

export interface IncidentGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  origin: string | null
  change: GraphCause | null
}

export interface Finding {
  id: string
  agent: string
  claim: string
  confidence: number
  query: string
  created_at: number
  evidence: Record<string, string[]>
}

export interface Task {
  task: string
  kind: string
  status: string
  created_at: number
  finished_at?: number | null
  agent: string
  handed_to?: string | null
  reason?: string | null
  handed_at?: number | null
}

export interface SimilarIncident {
  incident: string
  title: string
  started_at: number
  overlap: number
  change_caused: number
  score: number
  playbook_id: string
  playbook: string
  minutes: number
}

export interface PlaybookRank {
  playbook_id: string
  name: string
  wins: number
  losses: number
  score: number
  similar_incident?: string | null
  similar_minutes?: number | null
  boost?: number
  final?: number
  recommended?: boolean
}

export interface PagedPerson {
  person: string
  role: string
  team: string
  channel: string
  prior_fixes: number
}

export interface IncidentOutcome {
  playbook_id?: string | null
  playbook?: string | null
  worked?: boolean | null
  minutes?: number | null
  resolver?: string | null
}

export interface IncidentDetail {
  incident: IncidentSummary
  origin: string | null
  alerting: string[]
  alerts: Array<{
    alert: string
    metric: string
    severity: string
    fired_at: number
    service: string
  }>
  graph: IncidentGraph
  findings: Finding[]
  tasks: Task[]
  memory: {
    playbooks: PlaybookRank[]
    similar: SimilarIncident[]
  }
  page: PagedPerson | null
  outcome: IncidentOutcome | null
}

export interface KnowledgeSpof {
  service: string
  tier: number
  people_who_fixed_it: number
}

export interface KnowledgeDependedOn {
  service: string
  score: number
}

export interface KnowledgeChokepoint {
  service: string
  score: number
}

export interface KnowledgeView {
  spof: KnowledgeSpof[]
  depended_on: KnowledgeDependedOn[]
  chokepoints: KnowledgeChokepoint[]
}

export interface ServiceProfile {
  info: {
    service: string
    tier: number
    language: string
    slo_ms: number
    team: string
    channel: string
  }
  neighbors: {
    depends_on: string[]
    dependents: string[]
  }
  experts: Array<{
    person: string
    role: string
    incidents: number
    avg_minutes: number
  }>
  incidents: Array<{
    id: string
    title: string
    status: string
    started_at: number
    role: string
    cause?: string | null
  }>
  on_call: PagedPerson[]
}

export type PageRoute = 'overview' | 'graph' | 'why' | 'coordination' | 'memory' | 'brain'
