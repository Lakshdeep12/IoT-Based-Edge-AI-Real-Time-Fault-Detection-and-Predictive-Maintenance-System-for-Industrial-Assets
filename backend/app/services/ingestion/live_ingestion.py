import time
from datetime import datetime
from database.db import DatabaseSessionContext
from database.config import DEFAULT_DEVICE_ID
from dashboard.utils.serial_reader import DataConsumerEngine
from dashboard.utils.analytics import predict_asset_state, calculate_time_to_failure

def run_continuous_live_ingestion_pipeline(serial_port="COM3", model_choice="XGBoost"):
    """
    Main background process. Captures hardware telemetry, evaluates ML state classifications, 
    and handles live data ingestion loops into the database.
    """
    db_context = DatabaseSessionContext()
    
    # Initialize your PySerial port listener
    serial_stream = DataConsumerEngine(port=serial_port, baud_rate=115200)
    serial_stream.connect() # If hardware is missing, it falls back to your simulator automatically
    
    print(f"[INGESTION ENGINE] Active and running live on port {serial_port} using {model_choice} model processing matrix...")

    while True:
        # Read raw sensor packets
        packet = serial_stream.read_packet()
        
        if packet:
            # 1. Store Raw Telemetry Vectors
            sql_telemetry = """
                INSERT INTO telemetry (device_id, vibration_mps2, temperature_c) 
                VALUES (%s, %s, %s) RETURNING telemetry_id;
            """
            telemetry_id = db_context.execute_write(
                sql_telemetry, 
                (DEFAULT_DEVICE_ID, packet["Vibration"], packet["Temperature"])
            )
            
            if telemetry_id:
                # 2. Process Real-Time Machine Learning Classifications
                state_string, state_code = predict_asset_state(packet["Vibration"], packet["Temperature"], selection=model_choice)
                
                # Fetch recent historical frames from the DB to evaluate rolling trendline trajectories
                recent_data = db_context.execute_read(
                    "SELECT temperature_c AS Temperature FROM telemetry WHERE device_id = %s ORDER BY recorded_at DESC LIMIT 10;",
                    (DEFAULT_DEVICE_ID,)
                )
                
                # Format to a standard dataframe to match your Time-to-Failure functions
                import pandas as pd
                df_history = pd.DataFrame(recent_data[::-1]) # Reverse to put in correct chronological order
                ttf_prediction = calculate_time_to_failure(df_history, packet["Temperature"], 30.0, 200)
                
                # Extract numerical seconds value from string structure for storage parameters
                clean_ttf_sec = float(ttf_prediction.split('s')[0]) if ('s' in str(ttf_prediction)) else None

                # 3. Store Model Predictions
                sql_prediction = """
                    INSERT INTO predictions (device_id, telemetry_id, ml_model_used, predicted_state, predicted_code, time_to_failure_sec)
                    VALUES (%s, %s, %s, %s, %s, %s) RETURNING prediction_id;
                """
                prediction_id = db_context.execute_write(
                    sql_prediction,
                    (DEFAULT_DEVICE_ID, telemetry_id, model_choice, state_string, state_code, clean_ttf_sec)
                )

                # 4. Handle System Fault Alerts and Generative AI Diagnostics
                if state_code != 0 and prediction_id:
                    from dashboard.utils.llm_expert import generate_remediation_guide
                    
                    # Call Gemini API to write a tailored diagnostic report
                    llm_report = generate_remediation_guide(state_string, packet["Vibration"], packet["Temperature"])
                    
                    sql_alert = """
                        INSERT INTO alerts (device_id, prediction_id, alert_type, llm_remediation_guide)
                        VALUES (%s, %s, %s, %s);
                    """
                    db_context.execute_write(sql_alert, (DEFAULT_DEVICE_ID, prediction_id, state_string, llm_report))
                    print(f"[ALARM TRIGGERED] {state_string} detected! Automated root-cause report saved to DB.")

        time.sleep(0.01)

if __name__ == "__main__":
    # Allows you to test or run ingestion as a standalone background system service script
    run_continuous_live_ingestion_pipeline()