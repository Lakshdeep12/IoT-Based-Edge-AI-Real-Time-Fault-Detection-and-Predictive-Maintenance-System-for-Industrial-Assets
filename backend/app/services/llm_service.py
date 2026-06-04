import json
import urllib.request
import urllib.error
import logging
from typing import Dict, Any
from app.core.config import settings
from app.services.recommendation_service import RecommendationService

logger = logging.getLogger(__name__)

class LLMService:
    @staticmethod
    def generate_remediation_guide(
        fault_type: str, 
        temperature_c: float, 
        vibration_mps2: float, 
        device_id: str
    ) -> str:
        """
        Calls the Gemini API to generate a contextual, step-by-step diagnostic
        report based on real-time sensor metrics and the predicted fault.
        """
        # Fall back immediately if API key is not present
        if not settings.GEMINI_API_KEY:
            logger.info("GEMINI_API_KEY not found. Generating default diagnostic report.")
            return LLMService._get_fallback_text(fault_type, temperature_c, vibration_mps2)

        prompt = (
            f"You are a Senior Industrial Reliability Engineer. The IoT device '{device_id}' "
            f"has triggered a prediction warning for the fault state: '{fault_type}'.\n\n"
            f"Current Sensor Telemetry:\n"
            f"- Temperature: {temperature_c:.1f} °C\n"
            f"- Vibration: {vibration_mps2:.2f} m/s²\n\n"
            f"Provide a brief, professional, and actionable maintenance guide in Markdown. Include:\n"
            f"1. A quick root-cause analysis based on these metrics.\n"
            f"2. A numbered list of priority actions the technician on-site should execute immediately.\n"
            f"3. Suggested follow-up preventative steps.\n"
            f"Keep the formatting clean, clear, and professional. Avoid intro/outro chatter."
        )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ]
        }

        try:
            req = urllib.request.Request(
                url, 
                data=json.dumps(payload).encode("utf-8"), 
                headers=headers, 
                method="POST"
            )
            # 5-second timeout to avoid locking the ingestion loop
            with urllib.request.urlopen(req, timeout=5) as response:
                res_body = json.loads(response.read().decode("utf-8"))
                
                # Navigate standard Gemini JSON response structure
                candidates = res_body.get("candidates", [])
                if candidates:
                    content = candidates[0].get("content", {})
                    parts = content.get("parts", [])
                    if parts:
                        return parts[0].get("text", "")
            
            logger.warning("Empty response from Gemini API. Falling back.")
            return LLMService._get_fallback_text(fault_type, temperature_c, vibration_mps2)
            
        except urllib.error.URLError as e:
            logger.error(f"Gemini API connection error: {e}. Falling back.")
            return LLMService._get_fallback_text(fault_type, temperature_c, vibration_mps2)
        except Exception as e:
            logger.exception(f"Unexpected error calling Gemini API: {e}. Falling back.")
            return LLMService._get_fallback_text(fault_type, temperature_c, vibration_mps2)

    @staticmethod
    def _get_fallback_text(fault_type: str, temperature_c: float, vibration_mps2: float) -> str:
        """Assembles a beautiful fallback report based on static recommendations."""
        rec = RecommendationService.get_recommendation(fault_type)
        
        steps_markdown = "\n".join([f"{i+1}. {step}" for i, step in enumerate(rec["repair_steps"])])
        
        return (
            f"### Automated Diagnostics Report ({rec['priority']} Priority)\n\n"
            f"**Root Cause isolated:**\n"
            f"{rec['root_cause']}\n\n"
            f"**Operational Context:**\n"
            f"- Temperature: {temperature_c:.1f} °C (Vibration: {vibration_mps2:.2f} m/s²)\n\n"
            f"**Immediate Action Protocol:**\n"
            f"{steps_markdown}\n\n"
            f"**Preventative Measures:**\n"
            f"- {rec['maintenance_actions']}"
        )
