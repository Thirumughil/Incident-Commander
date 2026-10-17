"""FastAPI interface for the Incident Commander agent pipeline.

Run from the project root:

    python -m uvicorn src.ic.api:app --host 127.0.0.1 --port 8000

This file only translates HTTP to ``service.Service`` and service errors to status codes. The
rules (tenant checks, run lock, logging of tracebacks) live in ``service.py`` and are unit-tested.
"""
import logging
import os
from typing import Annotated

from fastapi import FastAPI, HTTPException, Path, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from .service import Service, ServiceError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="Incident Commander API",
    description="Graph-powered incident detection, analysis, response, and learning.",
    version="1.1.0",
)

# Comma-separated list in IC_CORS_ORIGINS overrides the local dev defaults.
_origins = os.getenv("IC_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,"
                                        "http://localhost:4173,http://127.0.0.1:4173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = Service()

TENANT_PATTERN = r"^[a-z][a-z0-9_]+$"
Tenant = Annotated[str, Query(min_length=2, max_length=32, pattern=TENANT_PATTERN,
                              description="Tenant name, for example acme or globex")]
IncidentId = Annotated[str, Path(pattern=r"^[A-Za-z0-9_.\-]{1,64}$")]
ServiceName = Annotated[str, Path(pattern=r"^[A-Za-z0-9_.\-]{1,64}$")]


class RunRequest(BaseModel):
    tenant: str = Field(default="acme", min_length=2, max_length=32, pattern=TENANT_PATTERN)
    use_llm: bool = False


class ResolveRequest(BaseModel):
    """Leave playbook and person out to use what the Responder recommended and paged."""
    model_config = ConfigDict(json_schema_extra={
        "examples": [{"tenant": "acme", "worked": True, "minutes": 9}],
    })

    tenant: str = Field(default="acme", min_length=2, max_length=32, pattern=TENANT_PATTERN)
    playbook: str | None = Field(default=None, description="Playbook id such as PB-04. Default: the recommended one.")
    worked: bool = True
    minutes: int | None = Field(default=None, ge=0, le=10080)
    person: str | None = Field(default=None, description="Who resolved it. Default: the person paged.")


class InjectRequest(BaseModel):
    """Demo helper: writes a bad config change and an alert burst. The Detector still has to find it."""
    model_config = ConfigDict(json_schema_extra={"examples": [{"tenant": "acme", "origin": "currency"}]})

    tenant: str = Field(default="acme", min_length=2, max_length=32, pattern=TENANT_PATTERN)
    origin: str = Field(default="currency", pattern=r"^[a-z0-9\-]{2,40}$")


def _call(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc))


@app.get("/health")
def health():
    return {"status": "ok", "service": "incident-commander-api"}


@app.get("/tenants")
def tenants():
    return {"tenants": _call(service.tenants)}


@app.get("/incidents")
def list_incidents(tenant: Tenant = "acme"):
    """Incident feed read from the graph, newest first."""
    return _call(service.incidents, tenant)


@app.get("/incidents/{incident_id}")
def get_incident(incident_id: IncidentId, tenant: Tenant = "acme"):
    """Everything the UI shows for one incident: graph nodes and edges, findings with their
    evidence, agent tasks, memory (similar incidents, playbook ranking) and the outcome."""
    return _call(service.incident, tenant, incident_id)


@app.get("/knowledge")
def get_knowledge(tenant: Tenant = "acme"):
    """Company-brain view: knowledge single points of failure, PageRank, betweenness."""
    return _call(service.knowledge, tenant)


@app.get("/services/{name}")
def get_service(name: ServiceName, tenant: Tenant = "acme"):
    """Who owns a service, who has fixed it, what broke it before, who is on call."""
    return _call(service.service, tenant, name)


@app.post("/incidents/run")
def run_incidents(request: RunRequest):
    """Run Detector -> Analyzer -> Responder on the tenant's open alerts.
    ``opened_count`` is 0 when there was nothing to process."""
    return _call(service.run, request.tenant, use_llm=request.use_llm)


@app.post("/incidents/{incident_id}/resolve")
def resolve_incident(incident_id: IncidentId, request: ResolveRequest):
    """Learner: record how an incident was fixed so the playbook ranking learns from it."""
    return _call(service.resolve, request.tenant, incident_id, playbook=request.playbook,
                 worked=request.worked, minutes=request.minutes, person=request.person)


@app.post("/demo/inject")
def inject_demo_incident(request: InjectRequest):
    """Fire the synthetic demo scenario into a tenant (a bad change plus four alerts)."""
    return _call(service.inject, request.tenant, origin=request.origin)
