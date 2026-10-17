// True when a person with this name exists in the tenant graph. Used to reject made-up responders.
// params: person
MATCH (p:Person {name: $person})
RETURN p.name AS person
