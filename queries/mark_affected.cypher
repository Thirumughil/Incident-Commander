// Record that an incident hit a service (role: origin or impacted).
// params: incident, service, role
MATCH (i:Incident {id: $incident}), (s:Service {name: $service})
MERGE (i)-[r:AFFECTED]->(s)
SET r.role = $role
