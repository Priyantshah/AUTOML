import pandas as pd
import argparse
import json
import numpy as np
import os

class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)

def impute_column_logic(df, col, strategy):
    """Helper to impute a single column in-place."""
    if col not in df.columns:
        return None, f"Column '{col}' not found"
        
    missing_count = df[col].isnull().sum()
    if missing_count == 0:
        return None, "No missing values"

    missing_indices = df[df[col].isnull()].index.tolist()
    
    # AUTO-DETECT STRATEGY
    if strategy is None or strategy == "auto":
        if pd.api.types.is_numeric_dtype(df[col]):
            strategy = "median"
        else:
            converted = pd.to_numeric(df[col], errors='coerce')
            if converted.notna().sum() > len(df) * 0.5:
                df[col] = converted
                strategy = "median"
            else:
                strategy = "mode"
    
    value = None
    if strategy == "mean":
        if not pd.api.types.is_numeric_dtype(df[col]):
             converted = pd.to_numeric(df[col], errors='coerce')
             if converted.notna().sum() > 0:
                 df[col] = converted
             else:
                 raise ValueError(f"Cannot calculate mean for non-numeric column '{col}'.")
        value = df[col].mean()
        df[col] = df[col].fillna(value)
        
    elif strategy == "median":
        if not pd.api.types.is_numeric_dtype(df[col]):
             converted = pd.to_numeric(df[col], errors='coerce')
             if converted.notna().sum() > 0:
                 df[col] = converted
             else:
                 raise ValueError(f"Cannot calculate median for non-numeric column '{col}'.")
        value = df[col].median()
        df[col] = df[col].fillna(value)
        
    elif strategy == "mode":
        value = df[col].mode().iloc[0]
        df[col] = df[col].fillna(value)
        
    else:
        raise ValueError(f"Unknown strategy: {strategy}")
        
    return {
        "column": col,
        "missing_count": int(missing_count),
        "strategy": strategy,
        "fill_value": value,
        "imputed_indices": missing_indices
    }, None

def impute_data(file_path, column=None, strategy=None):
    try:
        # Handle URL or local file
        if file_path.startswith('http'):
            df = pd.read_csv(file_path)
        else:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            df = pd.read_csv(file_path)
        
        results = []
        columns_to_process = []
        
        if column and column != "ALL":
            columns_to_process = [column]
        else:
            columns_to_process = df.columns.tolist()
            
        total_imputed = 0
        imputed_indices_map = {}
        
        for col in columns_to_process:
            # Skip if no missing values (optimization)
            if df[col].isnull().sum() == 0:
                continue
                
            res, err = impute_column_logic(df, col, strategy)
            if err:
                continue # Skip errors in bulk mode or handle? For single col it might throw.
            
            if res:
                results.append(res)
                total_imputed += res["missing_count"]
                imputed_indices_map[col] = res["imputed_indices"]

        if total_imputed == 0 and (column and column != "ALL"):
             return {
                "status": "success",
                "message": f"Column '{column}' has no missing values.",
                "imputed_count": 0
            }
        elif total_imputed == 0:
             return {
                "status": "success",
                "message": "No missing values found in dataset.",
                "imputed_count": 0
            }

        # Save to a temporary file
        temp_filename = f"imputed_{int(pd.Timestamp.now().timestamp())}.csv"
        temp_path = os.path.abspath(temp_filename)
        df.to_csv(temp_path, index=False)
        
        return {
            "status": "success",
            "message": f"Successfully imputed {total_imputed} missing values across {len(results)} columns.",
            "imputed_count": total_imputed,
            "temp_path": temp_path,
            "imputed_indices": imputed_indices_map if len(results) > 1 else results[0]["imputed_indices"],
            "strategy_used": "mixed" if len(results) > 1 else results[0]["strategy"],
            "details": results
        }

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, help="Path to CSV file")
    parser.add_argument("--column", required=False, default=None, help="Column to impute (optional, defaults to ALL)")
    parser.add_argument("--strategy", required=False, default=None, choices=['mean', 'median', 'mode', 'auto', None], help="Imputation strategy (default: auto)")
    
    args = parser.parse_args()
    
    result = impute_data(args.file, args.column, args.strategy)
    print(json.dumps(result, cls=NpEncoder))
