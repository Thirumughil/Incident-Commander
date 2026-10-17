// Every node that supports a finding, for all findings about an incident. Drawn as highlights in the graph.
// params: incident
MATCH (f:Finding)-[:ABOUT]->(:Incident {id: $incident})
MATCH (f)-[:EVIDENCE]->(e)
RETURN f.id AS finding, labels(e)[0] AS label, coalesce(e.name, e.id) AS key
ORDER BY finding, label, key
