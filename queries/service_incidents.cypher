// Recent incidents that touched a service and what caused them: decisions traced back to their source.
// params: service
MATCH (i:Incident)-[a:AFFECTED]->(:Service {name: $service})
OPTIONAL MATCH (i)-[:CAUSED_BY]->(c:Change)
RETURN i.id AS id, i.title AS title, i.status AS status, i.started_at AS started_at, a.role AS role, c.summary AS cause
ORDER BY started_at DESC
LIMIT 6
