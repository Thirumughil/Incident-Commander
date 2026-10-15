// Hand a task from one agent to another, leaving an auditable edge.
// params: task, to, now, reason
MATCH (t:Task {id: $task}), (to:Agent {name: $to})
SET t.status = 'handed_off'
CREATE (t)-[:HANDED_OFF_TO {at: $now, reason: $reason}]->(to)
