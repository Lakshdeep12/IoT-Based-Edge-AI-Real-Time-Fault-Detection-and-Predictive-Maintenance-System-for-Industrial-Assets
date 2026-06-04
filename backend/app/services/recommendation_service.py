from typing import Dict, Any

class RecommendationService:
    @staticmethod
    def get_recommendation(fault_type: str) -> Dict[str, Any]:
        """
        Returns structural details, priorities, and step-by-step remediation
        actions for a given predicted fault.
        """
        recommendations = {
            "Healthy": {
                "root_cause": "System is operating within nominal specifications.",
                "repair_steps": [
                    "No immediate repairs required.",
                    "Continue standard logging and operation."
                ],
                "maintenance_actions": "Perform standard quarterly checks.",
                "priority": "Info"
            },
            "Bearing Wear": {
                "root_cause": "Severe friction or mechanical fatigue in motor/shaft bearing assembly, typically caused by structural contamination or lubrication degradation.",
                "repair_steps": [
                    "Isolate the machine from power sources and trigger Lockout/Tagout (LOTO).",
                    "Dismantle housing and clean surrounding components.",
                    "Inspect bearings for physical spalling, scoring, or thermal discolouration.",
                    "Replace defective bearings with high-grade matching manufacturer components.",
                    "Pack bearings with grease (synthetic lithium-based) to 30-50% capacity."
                ],
                "maintenance_actions": "Schedule monthly grease lubrication and perform ultrasonic bearing listening analysis.",
                "priority": "Critical"
            },
            "Overheating": {
                "root_cause": "Abnormal thermal buildup, potentially due to motor winding insulation damage, blocked ventilation slots, low coolant flow, or ambient heat index spikes.",
                "repair_steps": [
                    "Temporarily reduce feed rate, load, or rotational speed.",
                    "Inspect thermal cooling fan shroud; clean blocked airflow vents.",
                    "Check electrical current draw on all phases to ensure balance.",
                    "Perform winding insulation resistance test (Megger test).",
                    "Verify coolant lines are clear and pump is operating correctly."
                ],
                "maintenance_actions": "Perform thermal imaging scans twice weekly and clean radiator fin shrouds.",
                "priority": "High"
            },
            "Shaft Misalignment": {
                "root_cause": "Angular or parallel displacement between motor and driven shafts, causing elevated high-frequency axial vibrations.",
                "repair_steps": [
                    "Shut down equipment and allow it to cool down to ambient temperature.",
                    "Attach dial indicators or laser alignment sensors to shafts.",
                    "Measure angular and offset misalignment across the coupling.",
                    "Adjust motor mounts using precision shims to eliminate 'soft foot' conditions.",
                    "Re-tighten motor foot bolts to specified torque settings and re-verify coupling tolerance."
                ],
                "maintenance_actions": "Schedule quarterly laser coupling alignment audits and log vibration spectra.",
                "priority": "Medium"
            },
            "Motor Overload": {
                "root_cause": "Operating beyond nominal mechanical torque/current parameters, usually due to gearbox binding, raw material jamming, or winding short circuits.",
                "repair_steps": [
                    "Verify current drawing in motor starter cabinet matches nameplate Full Load Amps (FLA).",
                    "Manually rotate motor shaft to check for binding in coupling or gearbox.",
                    "Examine gearbox for adequate oil levels and signs of gear damage.",
                    "Inspect downstream feed systems for mechanical blocks or material build-ups."
                ],
                "maintenance_actions": "Integrate current transducer telemetry for real-time electrical draw tracking and test motor overload relay settings.",
                "priority": "High"
            }
        }
        
        return recommendations.get(fault_type, recommendations["Healthy"])
