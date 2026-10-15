// Detector step 2: weakly connected components over RELATED_TO. Each component with open alerts is one incident.
// params: none
CALL algo.WCC({nodeLabels: ['Alert'], relationshipTypes: ['RELATED_TO']}) YIELD node, componentId
WHERE node.status = 'open'
RETURN componentId, collect(node.id) AS alerts
ORDER BY size(alerts) DESC
