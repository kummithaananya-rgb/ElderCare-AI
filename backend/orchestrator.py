"""
orchestrator.py
───────────────
ElderCare AI — Phase 2: Intent router and agent orchestrator.

Classifies incoming user messages using keyword matching and routes
them to the appropriate specialised agent.  Falls back to a general
ElderCare companion response (via watsonx_client.chat) for anything
that does not match a specialised domain.

No LLM call is made for routing — it is pure keyword matching,
keeping latency low and avoiding a double-call overhead.
"""

import logging
import re

import watsonx_client
import guardrails
from agents import HealthMonitorAgent, MedicineAdvisorAgent, WellbeingCompanionAgent
from model_providers import ModelProvider

logger = logging.getLogger(__name__)

# ── Keyword patterns per agent domain ────────────────────────────────────────
# Each tuple: (compiled regex, agent class)
# Patterns are checked in order; first match wins.
# The fallback (no match) is the general WellbeingCompanionAgent — it is the
# warmest and safest default for elderly users asking uncategorised questions.

_HEALTH_PATTERNS = re.compile(
    r"\b("
    r"health|symptom|vital|blood pressure|bp|sugar|glucose|weight|bmi|"
    r"heart rate|pulse|temperature|fever|headache|pain|dizz|nausea|"
    r"breathing|shortness of breath|chest|joint|swelling|wound|injury|"
    r"diet|nutrition|calori|protein|vitamin|mineral|hydrated|hydration|"
    r"wellness|active|healthy habits|water intake|"
    r"exercise|walk|steps|fitness|physical|sleep apn|snoring|"
    r"doctor|hospital|clinic|appointment|check.?up|test result|"
    r"diary|health log|mood log|how am i doing health"
    r")\b",
    re.IGNORECASE,
)

_MEDICINE_PATTERNS = re.compile(
    r"\b("
    r"medicine|medication|pill|tablet|capsule|drug|prescription|"
    r"dose|dosage|dosing|mg|milligram|inject|injection|insulin|"
    r"remind|reminder|schedule|when to take|forgot.*medicine|missed.*dose|"
    r"side effect|interaction|allergy|pharmacist|pharmacy|refill|"
    r"blood pressure.*tablet|diabetes.*medicine|heart.*medicine|"
    r"vitamin.*supplement|supplement|aspirin|metformin|paracetamol|ibuprofen"
    r")\b",
    re.IGNORECASE,
)

_WELLBEING_PATTERNS = re.compile(
    r"\b("
    r"lonely|alone|isol|sad|depress|anxious|anxiety|worry|scared|afraid|"
    r"miss.*family|miss.*friend|bored|nothing to do|"
    r"sleep|tired|rest|nap|insomnia|cant sleep|wake up|"
    r"happy|cheer|laugh|smile|joke|fun|enjoy|hobby|garden|music|read|"
    r"friend|family|son|daughter|grandchild|wife|husband|partner|"
    r"social|chat|talk|conversation|company|visit|call.*family|"
    r"motivat|purpose|meaning|feel.*good|feel.*better|"
    r"daily.*routine|morning.*routine|afternoon|evening|relax|meditat|yoga|stretch"
    r")\b",
    re.IGNORECASE,
)

# Singleton agent instances — created once, stateless.
_health_agent    = HealthMonitorAgent()
_medicine_agent  = MedicineAdvisorAgent()
_wellbeing_agent = WellbeingCompanionAgent()


def _classify(message: str):
    """
    Returns the agent instance most appropriate for the message.
    Applies medicine check before health check because medicine questions
    often contain health keywords too (e.g. 'blood pressure tablet').
    Falls back to the Wellbeing Companion for unmatched messages.
    """
    if _MEDICINE_PATTERNS.search(message):
        return _medicine_agent
    if _HEALTH_PATTERNS.search(message):
        return _health_agent
    if _WELLBEING_PATTERNS.search(message):
        return _wellbeing_agent
    # Default — warm, friendly, safe for any unclassified topic.
    return _wellbeing_agent


def run(model: ModelProvider, message: str, history: list) -> dict:
    """
    Route the message to the correct agent and return its reply.

    Parameters
    ----------
    model   : Provider implementing the shared inference interface
    message : The user's latest message
    history : List of prior turns [{'role': ..., 'content': ...}]

    Returns
    -------
    dict with keys:
        reply       (str)  — the agent's response text
        agent_name  (str)  — internal agent identifier (e.g. 'MedicineAdvisor')
        agent_label (str)  — display name with emoji (e.g. '💊 Medicine Advisor')
        agent_desc  (str)  — short description of the agent's role

    Raises
    ------
    RuntimeError — generic, credential-free; original logged server-side.
    """
    safety = guardrails.assess_request(message, history)
    if not safety.can_proceed:
        return {
            "reply": safety.safe_response,
            "agent_name": "SafetyGuardrails",
            "agent_label": "🛡️ Safety Guidance",
            "agent_desc": safety.category,
        }

    agent = _classify(message)
    logger.info("Orchestrator routed to: %s", agent.name)

    reply = agent.run(model, message, history)

    return {
        "reply":       reply,
        "agent_name":  agent.name,
        "agent_label": agent.display_name,
        "agent_desc":  agent.description,
    }
