// Incidents newest first with their origin service, for the incident feed (history is read from the graph, not the browser session).
// params: none
MATCH (i:Incident)
OPTIONAL MATCH (i)-[:AFFECTED {role: 'origin'}]->(s:Service)
RETURN i.id AS id, i.title AS title, i.status AS status, i.severity AS severity,
       i.started_at AS started_at, i.resolved_at AS resolved_at,
       i.recommended_playbook AS recommended_playbook, i.paged AS paged, s.name AS origin
ORDER BY started_at DESC
LIMIT 60
