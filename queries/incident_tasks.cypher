// Tasks for an incident with the agent they were assigned to and any handoff: the coordination trail.
// params: incident
MATCH (t:Task)-[:FOR]->(:Incident {id: $incident})
OPTIONAL MATCH (t)-[:ASSIGNED]->(a:Agent)
OPTIONAL MATCH (t)-[h:HANDED_OFF_TO]->(b:Agent)
RETURN t.id AS task, t.kind AS kind, t.status AS status, t.created_at AS created_at,
       t.finished_at AS finished_at, a.name AS agent, b.name AS handed_to, h.reason AS reason, h.at AS handed_at
ORDER BY created_at
