// Create a task for an agent. Shared state between agents lives here.
// params: incident, agent, task, kind, now
MATCH (i:Incident {id: $incident}), (ag:Agent {name: $agent})
CREATE (t:Task {id: $task, kind: $kind, status: 'open', created_at: $now})
CREATE (t)-[:FOR]->(i)
CREATE (t)-[:ASSIGNED]->(ag)
