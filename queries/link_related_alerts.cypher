// Detector step 1: connect open alerts that fired within 5 minutes on services within 2 dependency hops.
// params: none
MATCH (a:Alert {status: 'open'})-[:FIRED_ON]->(sa:Service)-[:DEPENDS_ON*0..2]-(sb:Service)<-[:FIRED_ON]-(b:Alert {status: 'open'})
WHERE a.id < b.id AND abs(a.fired_at - b.fired_at) <= 300
MERGE (a)-[:RELATED_TO]->(b)
