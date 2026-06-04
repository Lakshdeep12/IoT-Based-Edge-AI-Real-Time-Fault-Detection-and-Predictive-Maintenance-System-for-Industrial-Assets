import pandas as pd
from database.db import DatabaseSessionContext
from database.config import DEFAULT_DEVICE_ID

def bulk_import_csv_to_postgres(file_path):
    """
    Parses historical or pre-generated testing datasets (like synthetic_industrial_data.csv)
    and loads them efficiently into your time-series tables in bulk.
    """
    db_context = DatabaseSessionContext()
    
    try:
        print(f"[BULK INGESTION] Reading targets from file path: {file_path}")
        dataframe = pd.read_csv(file_path)
        
        sql_bulk = """
            INSERT INTO telemetry (device_id, vibration_mps2, temperature_c)
            VALUES (%s, %s, %s);
        """
        
        success_count = 0
        for index, row in dataframe.iterrows():
            # Handle mappings depending on column name schemes
            vib = row.get("Vibration") or row.get("vibration_mps2")
            temp = row.get("Temperature") or row.get("temp_c")
            
            db_context.execute_write(sql_bulk, (DEFAULT_DEVICE_ID, float(vib), float(temp)))
            success_count += 1
            
        print(f"[BULK INGESTION SUCCESS] Successfully pushed {success_count} structural metrics rows to database rows.")
    except Exception as error:
        print(f"[BULK INGESTION ERROR] Failed to process dataset: {error}")

if __name__ == "__main__":
    # Run this once to populate your database with your baseline training data metrics
    bulk_import_csv_to_postgres("ML_pipeline/synthetic_industrial_data.csv")