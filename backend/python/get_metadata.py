import sys
import pandas as pd
import json
import argparse

def get_metadata(file_path):
    try:

        # Optimization: Read first 100 rows for preview. 
        # 1000 was causing performance issues on frontend and backend. 100 is sufficient.
        df_preview = pd.read_csv(file_path, nrows=100)
        
        # Initialize missing counts
        missing_counts = pd.Series(0, index=df_preview.columns)
        
        # Efficiently count total rows and missing values using chunks
        row_count = 0
        try:
            # We need to read all columns to count missing values, so we can't use usecols=[0] anymore
            # But we can still use chunks to be memory efficient
            for chunk in pd.read_csv(file_path, chunksize=5000):
                row_count += len(chunk)
                # Align chunk columns with preview columns to ensure safety
                # (In case of weird CSVs, but usually they match)
                common_cols = chunk.columns.intersection(missing_counts.index)
                missing_counts[common_cols] += chunk.isnull()[common_cols].sum()
                
        except Exception:
             # Fallback: if chunk reading fails, rely on what we have or try full read
             try:
                 full_df = pd.read_csv(file_path)
                 row_count = len(full_df)
                 missing_counts = full_df.isnull().sum()
             except:
                 row_count = len(df_preview)
                 missing_counts = df_preview.isnull().sum()

        # Replace NaN with None (which becomes null in JSON) to avoid "NaN" in output
        # Node.js JSON.parse fails on NaN
        df_preview = df_preview.replace({float('nan'): None})
        
        metadata = {
            "columns": df_preview.columns.tolist(),
            "rowCount": row_count,
            "columnCount": len(df_preview.columns),
            "dtypes": df_preview.dtypes.astype(str).to_dict(),
            "preview": df_preview.to_dict(orient='records'),
            "missingCounts": missing_counts.to_dict()
        }
        
        print(json.dumps(metadata))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, help="Path or URL to the CSV file")
    args = parser.parse_args()
    
    get_metadata(args.file)
