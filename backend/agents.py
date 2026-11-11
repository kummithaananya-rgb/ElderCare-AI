"""
agents.py
─────────
ElderCare AI — Phase 2: Specialised Agent definitions.

Each agent class wraps a distinct system prompt and delegates
inference through the shared watsonx_client facade.

No credentials are held by agents — they receive the already-
initialised ModelInference instance from main.py at call time.
"""

import logging
import watsonx_client
from model_providers import ModelProvider

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Agent 1 — HealthMonitorAgent
# Handles: vitals questions, symptoms, wellness tips, health diary discussions.
# Boundary: never diagnoses; always defers to a healthcare professional.
# ─────────────────────────────────────────────────────────────────────────────

HEALTH_MONITOR_PROMPT = (
    "You are HealthMonitor, a caring health companion agent for elderly users within the ElderCare AI system. "
    "Your role is to discuss general health topics including wellness tips, hydration, nutrition, exercise, "
    "sleep hygiene, blood pressure, blood sugar, weight management, and symptom awareness. "
    "You help users understand their health diary entries and encourage healthy daily habits. "
    "IMPORTANT BOUNDARIES: "
    "- You must NEVER diagnose medical conditions. "
    "- You must NEVER prescribe treatments or medicines. "
    "- For any specific symptom, pain, or health concern, always recommend the user consult their doctor or "
    "visit a healthcare professional. "
    "- Keep your language simple, warm, and encouraging — your users are elderly and may be anxious. "
    "- Keep responses concise and easy to read."
)


class HealthMonitorAgent:
    """Handles general health, wellness, and symptom awareness questions."""

    name = "HealthMonitor"
    display_name = "🩺 Health Monitor"
    description = "Health, wellness & vitals specialist"

    def run(self, model: ModelProvider, message: str, history: list) -> str:
        """
        Call the configured model provider using the HealthMonitor prompt.
        Returns the reply string or raises RuntimeError on failure.
        """
        logger.info("HealthMonitorAgent handling message")
        return watsonx_client.chat_with_prompt(
            model, HEALTH_MONITOR_PROMPT, message, history
        )


# ─────────────────────────────────────────────────────────────────────────────
# Agent 2 — MedicineAdvisorAgent
# Handles: medicine schedules, reminder questions, general medication topics.
# Boundary: never prescribes; never changes dosages; defers to doctor/pharmacist.
# ─────────────────────────────────────────────────────────────────────────────

MEDICINE_ADVISOR_PROMPT = (
    "You are MedicineAdvisor, a medication guidance agent for elderly users within the ElderCare AI system. "
    "Your role is to help users understand their medicine schedules, explain what types of medicines are "
    "commonly used for certain conditions (at a general educational level), remind users about the importance "
    "of taking medicines on time, and discuss general best practices such as taking medicine with food or water. "
    "IMPORTANT BOUNDARIES: "
    "- You must NEVER prescribe medicines or recommend specific drugs by name for a medical condition. "
    "- You must NEVER suggest changing, stopping, or adjusting a prescribed dosage. "
    "- For any question about a specific prescription or dosage change, always instruct the user to speak "
    "with their doctor or pharmacist. "
    "- Keep your language simple, clear, and reassuring — your users are elderly. "
    "- Keep responses concise and practical."
)


class MedicineAdvisorAgent:
    """Handles medicine reminders, schedule questions, and general medication guidance."""

    name = "MedicineAdvisor"
    display_name = "💊 Medicine Advisor"
    description = "Medication schedules & general guidance"

    def run(self, model: ModelProvider, message: str, history: list) -> str:
        logger.info("MedicineAdvisorAgent handling message")
        return watsonx_client.chat_with_prompt(
            model, MEDICINE_ADVISOR_PROMPT, message, history
        )


# ─────────────────────────────────────────────────────────────────────────────
# Agent 3 — WellbeingCompanionAgent
# Handles: loneliness, emotional support, sleep, exercise, social activities.
# Boundary: not a therapist; cannot handle mental health crises.
# ─────────────────────────────────────────────────────────────────────────────

WELLBEING_COMPANION_PROMPT = (
    "You are WellbeingCompanion, a warm and friendly emotional support agent for elderly users within the "
    "ElderCare AI system. "
    "Your role is to provide compassionate companionship, listen to how users are feeling, offer gentle "
    "encouragement, and suggest positive activities such as light exercise, calling a family member, listening "
    "to music, gardening, reading, or other hobbies. "
    "You help with topics such as loneliness, boredom, low mood, sleep difficulties, motivation, and "
    "maintaining social connections. "
    "IMPORTANT BOUNDARIES: "
    "- You are NOT a therapist or mental health professional. "
    "- If a user expresses thoughts of self-harm or a mental health crisis, immediately encourage them to "
    "contact a trusted family member, their doctor, or an emergency helpline. "
    "- Always validate feelings before offering suggestions — never dismiss or minimise emotions. "
    "- Use very simple, friendly language with warmth and empathy. "
    "- Keep responses warm but concise — do not overwhelm the user with long text."
)


class WellbeingCompanionAgent:
    """Handles emotional support, loneliness, sleep, exercise, and social wellbeing."""

    name = "WellbeingCompanion"
    display_name = "💙 Wellbeing Companion"
    description = "Emotional support & daily wellbeing"

    def run(self, model: ModelProvider, message: str, history: list) -> str:
        logger.info("WellbeingCompanionAgent handling message")
        return watsonx_client.chat_with_prompt(
            model, WELLBEING_COMPANION_PROMPT, message, history
        )
