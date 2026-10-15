"""Run the agents end to end against one tenant graph."""
from .agents import Analyzer, Detector, Learner, Responder
from .graph import tenant_graph
from .tools import Tools


def tools_for(tenant, db=None):
    return Tools(tenant_graph(tenant, db))


def run_pipeline(tenant, use_llm=True, db=None):
    """Detector -> Analyzer -> Responder. Each agent finds its work as tasks in the graph."""
    tools = tools_for(tenant, db)
    opened = Detector(tools).run()
    analyzed = Analyzer(tools).run_pending()
    responded = Responder(tools, use_llm=use_llm).run_pending()
    return dict(tools=tools, opened=opened, analyzed=analyzed, responded=responded)


def resolve(tenant, incident, playbook=None, worked=True, minutes=None, person=None, db=None):
    tools = tools_for(tenant, db)
    return Learner(tools).resolve(incident, playbook=playbook, worked=worked, minutes=minutes, person=person)
