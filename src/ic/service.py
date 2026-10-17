"""Framework-free service layer behind the HTTP API.

``api.py`` only translates HTTP to these methods and these errors to status codes, so every
rule here (tenant checks, the per-tenant run lock, error mapping, logging) is tested offline.

Every unexpected failure is logged WITH its traceback before it is turned into an error. Hiding
the traceback was the reason the earlier "Resolution failed" error could not be diagnosed.
"""
import logging
import threading

from . import graph as graph_mod
from . import views

logger = logging.getLogger("ic.service")


class ServiceError(Exception):
    status = 500


class NotFound(ServiceError):
    status = 404


class BadRequest(ServiceError):
    status = 400


class Busy(ServiceError):
    status = 409


class Unavailable(ServiceError):
    status = 503


class Service:
    def __init__(self, get_db=None, list_tenants_fn=None, tools_fn=None, run_fn=None,
                 resolve_fn=None, inject_fn=None):
        from . import pipeline, scenario, tools as tools_mod

        self._get_db = get_db or graph_mod.get_db
        self._list_tenants = list_tenants_fn or graph_mod.list_tenants
        self._tools = tools_fn or (lambda tenant, db: tools_mod.Tools(graph_mod.tenant_graph(tenant, db)))
        self._run = run_fn or pipeline.run_pipeline
        self._resolve = resolve_fn or pipeline.resolve
        self._inject = inject_fn or scenario.inject_live
        self._db = None
        self._guard = threading.Lock()
        self._locks = {}

    # ---- plumbing ------------------------------------------------------------
    def db(self):
        with self._guard:
            if self._db is None:
                self._db = self._get_db()
            return self._db

    def _lock(self, tenant):
        with self._guard:
            return self._locks.setdefault(tenant, threading.Lock())

    def _unexpected(self, what, exc):
        logger.exception("%s failed", what)
        return Unavailable(f"{what} failed: {type(exc).__name__}: {exc}")

    def require_tenant(self, tenant):
        """Validate the name and make sure the tenant graph exists (never create one by typo)."""
        try:
            graph_mod.graph_name(tenant)
        except ValueError as exc:
            raise BadRequest(str(exc))
        try:
            known = self._list_tenants(self.db())
        except Exception as exc:  # noqa: BLE001
            raise self._unexpected("Listing tenants", exc)
        if tenant not in known:
            raise NotFound(f"unknown tenant {tenant!r}; known tenants: {', '.join(known) or 'none'}")

    def tools(self, tenant):
        self.require_tenant(tenant)
        return self._tools(tenant, self.db())

    def _read(self, what, tenant, fn):
        tools = self.tools(tenant)
        try:
            return fn(tools)
        except ServiceError:
            raise
        except KeyError as exc:
            raise NotFound(f"{exc.args[0] if exc.args else what} not found")
        except Exception as exc:  # noqa: BLE001
            raise self._unexpected(what, exc)

    # ---- reads ---------------------------------------------------------------
    def tenants(self):
        try:
            return self._list_tenants(self.db())
        except Exception as exc:  # noqa: BLE001
            raise self._unexpected("Listing tenants", exc)

    def incidents(self, tenant):
        return dict(tenant=tenant, incidents=self._read("Listing incidents", tenant, views.incident_summaries))

    def incident(self, tenant, incident_id):
        return self._read(f"Loading incident {incident_id}", tenant,
                          lambda tools: views.incident_detail(tools, incident_id))

    def knowledge(self, tenant):
        return self._read("Loading knowledge view", tenant, views.knowledge)

    def service(self, tenant, name):
        return self._read(f"Loading service {name}", tenant, lambda tools: views.service_profile(tools, name))

    # ---- actions -------------------------------------------------------------
    def run(self, tenant, use_llm=False):
        """Detector -> Analyzer -> Responder. Only one run per tenant at a time."""
        self.require_tenant(tenant)
        lock = self._lock(tenant)
        if not lock.acquire(blocking=False):
            raise Busy("a pipeline run is already in progress for this tenant")
        try:
            result = self._run(tenant, use_llm=use_llm, db=self.db())
        except ServiceError:
            raise
        except ValueError as exc:
            raise BadRequest(str(exc))
        except Exception as exc:  # noqa: BLE001
            raise self._unexpected("Pipeline run", exc)
        finally:
            lock.release()
        opened = result.get("opened", [])
        return dict(tenant=tenant, opened=opened, analyzed=result.get("analyzed", []),
                    responded=result.get("responded", []), opened_count=len(opened))

    def resolve(self, tenant, incident, playbook=None, worked=True, minutes=None, person=None):
        """Learner. Serialised per tenant so two clicks cannot double-count the same outcome."""
        self.require_tenant(tenant)
        with self._lock(tenant):
            try:
                return self._resolve(tenant, incident, playbook=playbook, worked=worked,
                                     minutes=minutes, person=person, db=self.db())
            except ServiceError:
                raise
            except LookupError as exc:
                raise NotFound(str(exc.args[0]) if exc.args else "not found")
            except ValueError as exc:
                raise BadRequest(str(exc))
            except Exception as exc:  # noqa: BLE001
                raise self._unexpected(f"Resolving {incident}", exc)

    def inject(self, tenant, origin="currency"):
        """Demo only: write a bad change plus an alert burst. The Detector still has to find it."""
        tools = self.tools(tenant)
        try:
            if not tools.service_info(origin):
                raise NotFound(f"unknown service {origin!r}")
            out = self._inject(tools.g, origin=origin)
        except ServiceError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise self._unexpected("Injecting the demo scenario", exc)
        return dict(tenant=tenant, **out)
