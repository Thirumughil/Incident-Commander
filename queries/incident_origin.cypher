// The service the Analyzer decided is the origin of an incident.
// params: incident
MATCH (:Incident {id: $incident})-[:AFFECTED {role: 'origin'}]->(s:Service)
RETURN s.name AS service, s.tier AS tier
