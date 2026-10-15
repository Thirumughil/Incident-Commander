"""Tenant graph access.

One FalkorDB graph per tenant (``tenant_<id>``) inside a single instance. Every
tool takes a ``tenant_id`` and goes through ``tenant_graph``; nothing accepts a
raw graph name, so a tenant can never reach another tenant's data.
"""
import re

from . import config

_TENANT_RE = re.compile(r"^[a-z][a-z0-9_]{1,31}$")


def graph_name(tenant_id: str) -> str:
    if not isinstance(tenant_id, str) or not _TENANT_RE.match(tenant_id):
        raise ValueError(
            f"invalid tenant id {tenant_id!r}: use 2-32 chars, lowercase letters, digits, underscore"
        )
    return f"{config.TENANT_PREFIX}{tenant_id}"


def get_db():
    # Imported lazily so the generator and its tests run without the client installed.
    from falkordb import FalkorDB

    return FalkorDB(
        host=config.FALKORDB_HOST,
        port=config.FALKORDB_PORT,
        username=config.FALKORDB_USERNAME,
        password=config.FALKORDB_PASSWORD,
    )


def tenant_graph(tenant_id: str, db=None):
    db = db or get_db()
    return db.select_graph(graph_name(tenant_id))


def list_tenants(db=None) -> list[str]:
    db = db or get_db()
    return sorted(
        g[len(config.TENANT_PREFIX):]
        for g in db.list_graphs()
        if g.startswith(config.TENANT_PREFIX)
    )
