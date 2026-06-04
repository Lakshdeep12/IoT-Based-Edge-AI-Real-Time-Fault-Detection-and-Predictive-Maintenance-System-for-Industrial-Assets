# Model Artifacts

Most model and scaler files in this folder are small enough to commit normally.

The following trained artifacts are intentionally excluded from Git because they exceed GitHub's 100 MB file limit:

- `Randomforest Trained/factory_sensor_simulator_rf.joblib`
- `Randomforest Trained/randomforest_Regressor/FD001-cmapss_regressor.joblib`
- `Randomforest Trained/randomforest_Regressor/FD002-cmapss_regressor.joblib`
- `Randomforest Trained/randomforest_Regressor/FD003-cmapss_regressor.joblib`
- `Randomforest Trained/randomforest_Regressor/FD004-cmapss_regressor.joblib`

For production, upload these files to Git LFS, cloud object storage, or the deployment platform's artifact storage and restore them at the same paths before starting the backend.

