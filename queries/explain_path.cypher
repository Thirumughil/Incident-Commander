// The dependency path that links an impacted service to the origin. Drawn in the "Why?" view.
// FalkorDB only allows shortestPath in WITH or RETURN, so the endpoints are matched first.
// params: impacted, origin
MATCH (a:Service {name: $impacted}), (b:Service {name: $origin})
WITH shortestPath((a)-[:DEPENDS_ON*]->(b)) AS p
RETURN [n IN nodes(p) | n.name] AS path, length(p) AS hops
