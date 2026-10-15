// Record who resolved an incident (feeds the "who knows this service" ranking).
// params: person, incident, minutes
MATCH (p:Person {name: $person}), (i:Incident {id: $incident})
MERGE (p)-[r:RESOLVED]->(i)
SET r.minutes = $minutes
