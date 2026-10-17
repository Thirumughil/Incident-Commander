// The change an incident was blamed on, if any.
// params: incident
MATCH (:Incident {id: $incident})-[:CAUSED_BY]->(c:Change)
RETURN c.id AS change, c.kind AS kind, c.summary AS summary, c.at AS at
