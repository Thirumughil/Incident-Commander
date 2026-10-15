// Services that sit on many dependency paths. EXPERIMENTAL: confirm the call signature in the algorithms docs.
// params: none
CALL algo.betweenness({nodeLabels: ['Service'], relationshipTypes: ['DEPENDS_ON']}) YIELD node, score
RETURN node.name AS service, score
ORDER BY score DESC
LIMIT 10
