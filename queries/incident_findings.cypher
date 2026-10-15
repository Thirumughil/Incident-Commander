// Every claim made about an incident, which agent made it, and the nodes that support it.
// params: incident
MATCH (f:Finding)-[:ABOUT]->(:Incident {id: $incident})
OPTIONAL MATCH (ag:Agent)-[:PRODUCED]->(f)
OPTIONAL MATCH (f)-[:EVIDENCE]->(e)
WITH f, ag, collect(DISTINCT coalesce(e.name, e.id)) AS evidence
RETURN f.id AS id, f.claim AS claim, f.confidence AS confidence, f.query AS query,
       f.created_at AS created_at, ag.name AS agent, evidence
ORDER BY created_at
