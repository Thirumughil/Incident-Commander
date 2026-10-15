// An agent polls the graph for its open tasks. Coordination happens here, not through messages.
// params: agent
MATCH (t:Task {status: 'open'})-[:ASSIGNED]->(:Agent {name: $agent})
MATCH (t)-[:FOR]->(i:Incident)
RETURN t.id AS task, t.kind AS kind, i.id AS incident, t.created_at AS created_at
ORDER BY created_at
