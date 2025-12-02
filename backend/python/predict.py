import argparse
import json
import joblib
import pandas as pd
import numpy as np
import requests
import os
import tempfile

class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)

def predict(model_url, input_data=None, input_file=None):
    try:
        # 1. Download Model
        # 1. Download Model
        # Check if model_url is a local path or URL
        if os.path.exists(model_url):
             tmp_path = model_url
             is_temp = False
        elif model_url.startswith("http"):
            response = requests.get(model_url)
            if response.status_code != 200:
                raise Exception(f"Failed to download model: {response.status_code}")
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pkl") as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name
            is_temp = True
        else:
            # It's a string but not a file and not http? Maybe a windows path that os.path.exists failed on?
            # Try to see if it's a path with quotes or something
            if os.path.exists(model_url.strip('"').strip("'")):
                 tmp_path = model_url.strip('"').strip("'")
                 is_temp = False
            else:
                 raise Exception(f"Invalid model path or URL: {model_url}. If you are running the backend on a remote server (e.g. Render) and trained the model locally, the server cannot access your local file path. Please train the model on the server or use a public URL.")

        # 2. Load Model
        artifact = joblib.load(tmp_path)
        if is_temp:
            os.unlink(tmp_path) # Cleanup
        
        model = artifact["model"]
        preprocessor = artifact["preprocessor"]
        task_type = artifact.get("task_type", "Unknown")
        
        # 3. Prepare Input
        if input_file:
            df = pd.read_csv(input_file)
        elif input_data:
            # input_data is expected to be a dictionary or list of dictionaries
            if isinstance(input_data, str):
                input_data = json.loads(input_data)
            df = pd.DataFrame(input_data)
        else:
            raise Exception("No input provided")
        
        # 4. Preprocess (Transform using saved pipeline)
        try:
            # Check if columns match (ignoring extra columns in CSV if any, but missing columns is fatal)
            # The pipeline expects specific columns.
            # We might need to handle missing columns if they are nullable, but usually we expect match.
            X_scaled = preprocessor.transform(df)
        except Exception as e:
            # Fallback: maybe columns don't match or encoding needed.
            # For this MVP, we return error if schema mismatch.
            raise Exception(f"Preprocessing failed. Ensure input matches training features. Error: {str(e)}")

        target_encoder = artifact.get("target_encoder")

        # 5. Predict
        prediction = model.predict(X_scaled)
        
        # Inverse transform if encoder exists
        if target_encoder:
            try:
                prediction = target_encoder.inverse_transform(prediction)
            except Exception as e:
                # Fallback if inverse transform fails (e.g. unseen labels? shouldn't happen with inverse)
                pass
        
        result = {
            "task_type": task_type
        }

        if input_file:
            # Add prediction to dataframe
            df['Prediction'] = prediction
            
            # Save to new CSV
            output_filename = input_file.replace('.csv', '_predictions.csv')
            df.to_csv(output_filename, index=False)
            
            result["csv_path"] = os.path.abspath(output_filename)
            # Also return first 50 rows for preview
            # Replace NaN with None for JSON compatibility
            preview_df = df.head(50).replace({float('nan'): None})
            result["preview"] = preview_df.to_dict(orient='records')
        else:
            result["prediction"] = prediction.tolist()
        
        print(json.dumps(result, cls=NpEncoder))

    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, help="URL of the model file")
    parser.add_argument("--input", required=False, help="Input data as JSON string")
    parser.add_argument("--input_file", required=False, help="Path to input CSV file")
    args = parser.parse_args()
    
    predict(args.model, args.input, args.input_file)
