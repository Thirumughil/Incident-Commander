"""Static, synthetic topology for the demo company.

All data here is invented. Service names follow the public OpenTelemetry demo
application (frontend, cart, checkout, payment, currency, ...), extended with made-up
infrastructure and business services to reach about 40 services. Nothing is real.
"""

# team -> slack channel
TEAMS = {
    "storefront": "#team-storefront",
    "checkout": "#team-checkout",
    "payments": "#team-payments",
    "catalog": "#team-catalog",
    "growth": "#team-growth",
    "messaging": "#team-messaging",
    "platform": "#team-platform",
    "data": "#team-data",
}

# name, tier (1 = customer facing and critical), language, owning team, slo_ms
SERVICES = [
    ("frontend", 1, "typescript", "storefront", 300),
    ("frontend-proxy", 1, "envoy", "storefront", 100),
    ("image-provider", 3, "nginx", "storefront", 500),
    ("web-assets-cdn", 3, "managed", "storefront", 200),

    ("checkout", 1, "go", "checkout", 800),
    ("cart", 1, "dotnet", "checkout", 250),
    ("order-service", 1, "java", "checkout", 600),
    ("shipping", 2, "rust", "checkout", 700),
    ("quote", 2, "php", "checkout", 400),

    ("payment", 1, "javascript", "payments", 900),
    ("currency", 1, "cpp", "payments", 150),
    ("fraud-detection", 2, "kotlin", "payments", 500),
    ("ledger", 2, "java", "payments", 600),
    ("tax-service", 3, "python", "payments", 400),

    ("product-catalog", 1, "go", "catalog", 250),
    ("search", 2, "python", "catalog", 400),
    ("recommendation", 2, "python", "catalog", 500),
    ("inventory", 2, "java", "catalog", 300),
    ("pricing", 2, "go", "catalog", 250),

    ("ad", 3, "java", "growth", 400),
    ("promotions", 3, "python", "growth", 400),
    ("loyalty", 3, "ruby", "growth", 500),
    ("analytics-events", 3, "go", "growth", 800),

    ("email", 3, "ruby", "messaging", 2000),
    ("notification", 3, "go", "messaging", 1000),
    ("sms-gateway", 3, "python", "messaging", 2000),
    ("webhook-dispatcher", 3, "node", "messaging", 1500),

    ("auth", 1, "go", "platform", 120),
    ("api-gateway", 1, "go", "platform", 100),
    ("config-service", 2, "go", "platform", 100),
    ("feature-flags", 2, "go", "platform", 80),
    ("rate-limiter", 2, "rust", "platform", 50),
    ("service-mesh", 2, "envoy", "platform", 20),
    ("secrets-vault", 2, "managed", "platform", 100),

    ("kafka", 1, "managed", "data", 50),
    ("postgres-orders", 1, "managed", "data", 40),
    ("redis-cache", 1, "managed", "data", 5),
    ("elasticsearch", 2, "managed", "data", 80),
    ("data-warehouse", 3, "managed", "data", 5000),
    ("etl-pipeline", 3, "python", "data", 60000),
]

# service -> "dependency:kind:criticality" (the service DEPENDS_ON the dependency).
# kind: sync | async | db ; criticality: hard | soft
_DEPS = {
    "frontend-proxy": ["frontend:sync:hard"],
    "frontend": [
        "api-gateway:sync:hard", "product-catalog:sync:hard", "cart:sync:hard",
        "recommendation:sync:soft", "ad:sync:soft", "checkout:sync:hard",
        "currency:sync:hard", "image-provider:sync:soft", "search:sync:soft",
    ],
    "image-provider": ["web-assets-cdn:sync:hard"],
    "api-gateway": ["auth:sync:hard", "rate-limiter:sync:hard", "service-mesh:sync:hard"],
    "auth": ["redis-cache:db:hard", "secrets-vault:sync:hard"],
    "rate-limiter": ["redis-cache:db:hard"],
    "service-mesh": ["config-service:sync:hard"],
    "config-service": ["secrets-vault:sync:hard"],
    "feature-flags": ["config-service:sync:hard"],
    "cart": ["redis-cache:db:hard", "product-catalog:sync:hard"],
    "checkout": [
        "cart:sync:hard", "payment:sync:hard", "shipping:sync:hard",
        "email:async:soft", "currency:sync:hard", "product-catalog:sync:hard",
        "order-service:sync:hard", "quote:sync:hard", "tax-service:sync:soft",
        "promotions:sync:soft", "kafka:async:hard",
    ],
    "order-service": ["postgres-orders:db:hard", "kafka:async:hard", "inventory:sync:hard"],
    "shipping": ["quote:sync:hard", "kafka:async:soft"],
    "quote": ["currency:sync:hard"],
    "payment": ["currency:sync:hard", "fraud-detection:sync:hard", "ledger:sync:hard", "secrets-vault:sync:hard"],
    "currency": ["config-service:sync:soft", "redis-cache:db:hard"],
    "fraud-detection": ["kafka:async:hard", "redis-cache:db:soft"],
    "ledger": ["postgres-orders:db:hard"],
    "tax-service": ["config-service:sync:hard"],
    "product-catalog": ["elasticsearch:db:soft", "redis-cache:db:soft", "pricing:sync:hard", "inventory:sync:hard"],
    "search": ["elasticsearch:db:hard", "product-catalog:sync:soft"],
    "recommendation": ["product-catalog:sync:hard", "analytics-events:async:soft", "redis-cache:db:soft"],
    "inventory": ["postgres-orders:db:hard", "kafka:async:soft"],
    "pricing": ["currency:sync:hard", "feature-flags:sync:soft", "promotions:sync:soft"],
    "promotions": ["feature-flags:sync:hard", "postgres-orders:db:hard"],
    "loyalty": ["postgres-orders:db:hard", "promotions:sync:soft"],
    "ad": ["analytics-events:async:soft", "redis-cache:db:soft"],
    "analytics-events": ["kafka:async:hard"],
    "email": ["config-service:sync:soft"],
    "notification": ["kafka:async:hard", "sms-gateway:sync:soft", "email:sync:hard"],
    "webhook-dispatcher": ["kafka:async:hard"],
    "etl-pipeline": ["kafka:async:hard", "data-warehouse:db:hard"],
}


def dependencies():
    """List of (src, dst, kind, criticality) edges."""
    out = []
    for src, items in _DEPS.items():
        for item in items:
            dst, kind, crit = item.split(":")
            out.append((src, dst, kind, crit))
    return out


# Fixed people for the main demo tenant. The first person of each team is the one
# on call during the demo. Priya Raman (payments) is the demo's hero responder.
PEOPLE_ACME = {
    "storefront": [("Meera Joshi", "Senior SRE"), ("Daniel Okafor", "Backend Engineer"), ("Lucia Alvarez", "Staff Engineer")],
    "checkout": [("Rahul Nair", "Senior SRE"), ("Sneha Das", "Backend Engineer"), ("Tom Becker", "Staff Engineer")],
    "payments": [("Priya Raman", "Senior SRE"), ("Arjun Mehta", "Backend Engineer"), ("Hannah Lee", "Staff Engineer")],
    "catalog": [("Kavya Iyer", "Senior SRE"), ("Marcus Webb", "Backend Engineer"), ("Yuki Tanaka", "Backend Engineer")],
    "growth": [("Vikram Rao", "Backend Engineer"), ("Sara Haddad", "Backend Engineer")],
    "messaging": [("Ananya Pillai", "Senior SRE"), ("Oliver Grant", "Backend Engineer")],
    "platform": [("Imran Qureshi", "Senior SRE"), ("Nina Petrova", "Staff Engineer"), ("Karthik Menon", "Backend Engineer")],
    "data": [("Elena Rossi", "Senior SRE"), ("Joon Park", "Backend Engineer"), ("Fatima Noor", "Backend Engineer")],
}

# Name pool for other tenants (people are assigned to teams from a seeded shuffle).
PEOPLE_POOL = [
    ("Aiden Clarke", "Senior SRE"), ("Bianca Moreau", "Backend Engineer"), ("Chidi Eze", "Staff Engineer"),
    ("Dara Lindqvist", "Senior SRE"), ("Emeka Obi", "Backend Engineer"), ("Farah Siddiqui", "Backend Engineer"),
    ("Gabriel Souza", "Senior SRE"), ("Hana Kimura", "Backend Engineer"), ("Isla Murray", "Staff Engineer"),
    ("Jamal Hughes", "Senior SRE"), ("Keiko Abe", "Backend Engineer"), ("Leo Fontaine", "Backend Engineer"),
    ("Mina Kapoor", "Senior SRE"), ("Noah Peters", "Backend Engineer"), ("Olga Smirnova", "Staff Engineer"),
    ("Pablo Cortez", "Senior SRE"), ("Quinn Foster", "Backend Engineer"), ("Rosa Delgado", "Backend Engineer"),
    ("Sven Larsen", "Senior SRE"), ("Tara Bell", "Backend Engineer"), ("Uma Reddy", "Staff Engineer"),
    ("Victor Hale", "Senior SRE"), ("Wen Zhao", "Backend Engineer"), ("Xavier Mills", "Backend Engineer"),
    ("Yara Nasser", "Senior SRE"), ("Zane Ortiz", "Backend Engineer"),
]

# Services only one person ever fixes (so the bus-factor query has results).
SINGLE_RESPONDER_SERVICES = {
    "web-assets-cdn", "sms-gateway", "webhook-dispatcher", "tax-service", "ledger",
}

# id, name, steps, cause it addresses, applies_to ("all" or list of services),
# prior successes, prior failures. Prior counts stand for history from before the
# seeded incidents; seeded incident outcomes are added on top.
PLAYBOOKS = [
    ("PB-01", "rollback-last-change", "Find the most recent change on the service or its upstream and roll it back.",
     "A recent deploy introduced a regression", "all", 7, 2),
    ("PB-02", "restart-pods", "Restart the pods of the service one at a time and watch error rate.",
     "Service degraded after a memory leak or stuck threads", "all", 6, 4),
    ("PB-03", "scale-out", "Add replicas and raise the autoscaler minimum.",
     "Traffic exceeded provisioned capacity", "all", 4, 3),
    ("PB-04", "rollback-pool-config", "Restore the previous database connection pool size and recycle connections.",
     "Database connection pool limit lowered, requests queued",
     ["currency", "payment", "ledger", "order-service", "inventory", "auth", "promotions", "loyalty"], 2, 0),
    ("PB-05", "flush-cache", "Flush the affected keyspace and let the cache warm under rate limiting.",
     "Cache eviction storm after a bad key rollout",
     ["product-catalog", "cart", "auth", "rate-limiter", "recommendation", "currency", "redis-cache"], 4, 1),
    ("PB-06", "failover-database", "Promote the replica, repoint services, then rebuild the old primary.",
     "Primary database unhealthy",
     ["postgres-orders", "ledger", "order-service", "inventory", "promotions", "loyalty"], 2, 0),
    ("PB-07", "disable-feature-flag", "Switch off the flag that shipped with the last release.",
     "A newly enabled feature flag overloaded a dependency",
     ["pricing", "promotions", "feature-flags", "frontend", "checkout"], 5, 1),
    ("PB-08", "drain-kafka-lag", "Add consumers, pause producers, and drain the backlog.",
     "Consumer lag built up and delayed downstream work",
     ["kafka", "fraud-detection", "order-service", "notification", "analytics-events", "etl-pipeline", "shipping", "inventory"], 3, 1),
    ("PB-09", "rotate-secrets", "Rotate the expired credential and restart the clients.",
     "An expired credential caused authentication failures",
     ["secrets-vault", "auth", "payment", "config-service"], 1, 0),
    ("PB-10", "enable-circuit-breaker", "Enable the circuit breaker so failures stop cascading to callers.",
     "A slow upstream dependency caused timeouts to cascade",
     ["checkout", "payment", "frontend", "shipping", "quote", "currency", "cart"], 5, 2),
    ("PB-11", "reindex-search", "Rebuild the search index from the catalog and swap aliases.",
     "Search index corrupted after a mapping change",
     ["elasticsearch", "search", "product-catalog"], 2, 1),
    ("PB-12", "purge-cdn", "Purge the CDN cache for the affected paths.",
     "Stale or broken assets served from the CDN",
     ["web-assets-cdn", "image-provider", "frontend-proxy", "frontend"], 2, 0),
    ("PB-13", "throttle-traffic", "Lower rate limits for non-critical clients to protect the core path.",
     "A traffic spike from a misbehaving client",
     ["api-gateway", "rate-limiter", "frontend-proxy", "frontend"], 3, 1),
    ("PB-14", "restart-consumers", "Restart the message consumers and replay the last failed batch.",
     "Consumers stuck on a poison message",
     ["notification", "email", "webhook-dispatcher", "sms-gateway", "etl-pipeline"], 4, 2),
    ("PB-15", "refresh-config", "Force a configuration reload and verify the served version.",
     "Stale configuration served to some instances",
     ["config-service", "currency", "tax-service", "service-mesh", "feature-flags"], 2, 2),
]

ALERT_METRICS = [
    ("p99_latency_ms", "warning"), ("p99_latency_ms", "critical"),
    ("error_rate_pct", "warning"), ("error_rate_pct", "critical"),
    ("saturation_pct", "warning"), ("timeouts_per_min", "critical"),
]

CHANGE_KINDS = ["deploy", "config", "flag"]
CHANGE_SUMMARIES = {
    "deploy": ["Release {n}: dependency upgrade", "Release {n}: refactor request handler", "Release {n}: new retry logic"],
    "config": ["Raise request timeout", "Lower DB connection pool 50 -> 10", "Change cache TTL", "Adjust worker count"],
    "flag": ["Enable new ranking flag", "Enable async writes flag", "Enable batch lookups flag"],
}
