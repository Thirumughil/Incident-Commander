"""FastAPI interface for the Incident Commander agent pipeline."""
from typing import Literal
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .graph import list_tenants
from .pipeline import resolve, run_pipeline

app = FastAPI(
    title="Incident Commander API",
    description="Graph-powered incident detection, analysis, response, and learning.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RunRequest(BaseModel):
    tenant: str = Field(default="acme", min_length=2, max_length=32, pattern=r"^[a-z][a-z0-9_]+$")
    use_llm: bool = False


class ResolveRequest(BaseModel):
    tenant: str = Field(default="acme", min_length=2, max_length=32, pattern=r"^[a-z][a-z0-9_]+$")
    playbook: str | None = None
    worked: bool = True
    minutes: int | None = Field(default=None, ge=0, le=10080)
    person: str | None = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "incident-commander-api"}


@app.get("/tenants")
def tenants():
    try:
        return {"tenants": list_tenants()}
    except Exception:
        raise HTTPException(status_code=503, detail="Unable to query tenant graphs. Check FalkorDB connectivity.")


@app.post("/incidents/run")
def run_incidents(request: RunRequest):
    try:
        result = run_pipeline(request.tenant, use_llm=request.use_llm)
        return {
            "tenant": request.tenant,
            "opened": result["opened"],
            "analyzed": result["analyzed"],
            "responded": result["responded"],
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=503, detail="Pipeline failed. Check API logs and FalkorDB connectivity.")


@app.post("/incidents/{incident_id}/resolve")
def resolve_incident(
    incident_id: str,
    request: ResolveRequest,
):
    try:
        result = resolve(
            request.tenant,
            incident_id,
            playbook=request.playbook,
            worked=request.worked,
            minutes=request.minutes,
            person=request.person,
        )
        if result is None:
            raise HTTPException(status_code=404, detail="Incident not found.")
        return result
    except HTTPException:
        raise
    except (KeyError, TypeError):
        raise HTTPException(status_code=404, detail="Incident not found or missing required incident data.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=503, detail="Resolution failed. Check API logs and FalkorDB connectivity.")
