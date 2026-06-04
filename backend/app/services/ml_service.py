import os
from pathlib import Path
import joblib
import numpy as np
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[3]
MODELS_DIR = PROJECT_ROOT / "ml_engine" / "models" / "Randomforest Trained"
SCALER_DIR = PROJECT_ROOT / "ml_engine" / "models" / "Scaler"

class MLService:
    _model = None
    _scaler = None
    _model_name = "machine_failure"

    @classmethod
    def load_model_and_scaler(cls):
        """Lazy loads the random forest classifier and standard scaler."""
        if cls._model is None or cls._scaler is None:
            try:
                model_path = MODELS_DIR / f"{cls._model_name}.joblib"
                scaler_path = SCALER_DIR / f"{cls._model_name}_scaler.joblib"
                
                if os.path.exists(model_path) and os.path.exists(scaler_path):
                    cls._model = joblib.load(model_path)
                    cls._scaler = joblib.load(scaler_path)
                    logger.info(f"ML Model '{cls._model_name}' and scaler loaded successfully.")
                else:
                    logger.error(f"Model or scaler files not found in: {model_path} / {scaler_path}")
            except Exception as e:
                logger.exception(f"Error loading ML models: {e}")

    @classmethod
    def predict(cls, temperature_c: float, vibration_mps2: float, runtime_hours: float = 0.0) -> Dict[str, Any]:
        """
        Runs ML inference on device telemetry.
        Returns:
            Dict containing predicted_state, predicted_code, failure_probability, health_score, and RUL.
        """
        cls.load_model_and_scaler()

        # Fallback values if models are missing
        if cls._model is None or cls._scaler is None:
            logger.warning("ML models not loaded. Falling back to rule-based engine.")
            return cls._fallback_rule_based(temperature_c, vibration_mps2, runtime_hours)

        try:
            # Scale features. The 'machine_failure' model expects 6 features:
            # ['Temperature', 'Vibration', 'Power_Usage', 'Humidity', 'Machine_Type_Lathe', 'Machine_Type_Mill']
            # Map telemetry inputs and fill in typical defaults for other variables.
            power_usage = 1200.0  # W (typical industrial motor load)
            humidity = 45.0       # % RH (typical workshop humidity)
            machine_type_lathe = 1.0
            machine_type_mill = 0.0

            # Scale
            features = np.array([[temperature_c, vibration_mps2, power_usage, humidity, machine_type_lathe, machine_type_mill]])
            scaled_features = cls._scaler.transform(features)

            # Predict
            pred_code = int(cls._model.predict(scaled_features)[0])
            probabilities = cls._model.predict_proba(scaled_features)[0]
            fail_prob = float(probabilities[1])

            # Calculate Health Score based on failure probability
            health_score = int((1.0 - fail_prob) * 100)
            health_score = max(5, min(100, health_score))  # bound between 5% and 100%

            # Estimate Remaining Useful Life (RUL) in days based on health and runtime
            # A standard healthy machine has 180 days RUL. RUL decays as health declines or runtime increases.
            base_rul_days = (health_score / 100.0) * 180
            # Decelerate RUL if temperature or vibration are elevated
            degradation_factor = 1.0
            if temperature_c > 85.0 or vibration_mps2 > 4.5:
                degradation_factor = 0.3
            elif temperature_c > 75.0 or vibration_mps2 > 3.0:
                degradation_factor = 0.6
                
            rul_days = int(base_rul_days * degradation_factor)
            rul_days = max(1, rul_days)

            # Determine Specific Fault Type
            predicted_state = "Healthy"
            if pred_code == 1 or fail_prob > 0.4:
                pred_code = 1
                # Diagnostics Heuristics
                if vibration_mps2 > 4.0:
                    predicted_state = "Bearing Wear"
                elif temperature_c > 80.0:
                    predicted_state = "Overheating"
                elif vibration_mps2 > 2.5 and temperature_c > 65.0:
                    predicted_state = "Shaft Misalignment"
                else:
                    predicted_state = "Motor Overload"

            return {
                "predicted_state": predicted_state,
                "predicted_code": pred_code,
                "confidence": round(max(fail_prob, 1.0 - fail_prob) * 100, 2),
                "failure_probability": round(fail_prob * 100, 2),
                "health_score": health_score,
                "rul_days": rul_days
            }

        except Exception as e:
            logger.error(f"Inference pipeline failed: {e}. Reverting to heuristics.")
            return cls._fallback_rule_based(temperature_c, vibration_mps2, runtime_hours)

    @classmethod
    def _fallback_rule_based(cls, temperature_c: float, vibration_mps2: float, runtime_hours: float) -> Dict[str, Any]:
        """Provides high-fidelity heuristic fallback in case the model file fails to load."""
        vib_ratio = min(1.0, vibration_mps2 / 18.0) # normal limit in firmware is 18.0
        temp_ratio = min(1.0, temperature_c / 80.0) # normal limit is 80.0

        # Max ratio represents the degradation factor
        degradation = max(vib_ratio, temp_ratio)
        fail_prob = degradation * 100
        health_score = int(100 - fail_prob)
        health_score = max(5, min(100, health_score))

        pred_code = 0
        predicted_state = "Healthy"

        if vibration_mps2 > 15.0 or temperature_c > 75.0 or fail_prob > 50:
            pred_code = 1
            if vibration_mps2 > 15.0:
                predicted_state = "Bearing Wear"
            elif temperature_c > 75.0:
                predicted_state = "Overheating"
            elif vibration_mps2 > 10.0:
                predicted_state = "Shaft Misalignment"
            else:
                predicted_state = "Motor Overload"

        # RUL Heuristic
        rul_days = int((health_score / 100.0) * 180)
        rul_days = max(1, rul_days)

        return {
            "predicted_state": predicted_state,
            "predicted_code": pred_code,
            "confidence": round(max(degradation, 1.0 - degradation) * 100, 2),
            "failure_probability": round(fail_prob, 2),
            "health_score": health_score,
            "rul_days": rul_days
        }
