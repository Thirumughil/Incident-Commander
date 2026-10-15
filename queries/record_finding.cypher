// Store a claim with the query that produced it and link the nodes that support it.
// params: incident, agent, fid, claim, confidence, query, now, node_ids (internal ids)
MATCH (i:Incident {id: $incident}), (a:Agent {name: $agent})
CREATE (f:Finding {id: $fid, claim: $claim, confidence: $confidence, query: $query, created_at: $now})
CREATE (a)-[:PRODUCED]->(f)
CREATE (f)-[:ABOUT]->(i)
WITH f
MATCH (e) WHERE id(e) IN $node_ids
CREATE (f)-[:EVIDENCE]->(e)
