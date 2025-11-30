import sys
import pandas as pd
import json
import argparse
import numpy as np
import warnings

warnings.filterwarnings("ignore")

# Handle JSON serialization of numpy types
class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)

def recommend_model(df, target_column, task_type, correlation):
    """
    Heuristic-based model recommendation.
    """
    recommendation = {
        "model": "Unknown",
        "reason": "Insufficient data to recommend."
    }
    
    try:
        if task_type == "Regression":
            # Check for linearity
            max_corr = 0
            if correlation and target_column in correlation:
                # Filter out the target itself
                corrs = [abs(val) for key, val in correlation[target_column].items() if key != target_column and val is not None]
                if corrs:
                    max_corr = max(corrs)
            
            if max_corr > 0.7:
                recommendation = {
                    "model": "Linear Regression",
                    "reason": f"High linear correlation detected (Max Corr: {max_corr:.2f}). Linear models should perform well."
                }
            elif len(df) < 1000:
                recommendation = {
                    "model": "Random Forest Regressor",
                    "reason": "Small dataset with potential non-linearities. Random Forest is robust and handles this well."
                }
            else:
                recommendation = {
                    "model": "XGBoost Regressor",
                    "reason": "Larger dataset. XGBoost often provides state-of-the-art performance for structured data."
                }
                
        elif task_type == "Classification":
            target_unique = df[target_column].nunique()
            if target_unique == 2:
                recommendation = {
                    "model": "Logistic Regression",
                    "reason": "Binary classification problem. Logistic Regression is a good baseline."
                }
            else:
                recommendation = {
                    "model": "Random Forest Classifier",
                    "reason": f"Multiclass problem ({target_unique} classes). Random Forest handles complex boundaries well."
                }
                
    except Exception as e:
        recommendation["reason"] = f"Could not determine due to error: {str(e)}"
        
    return recommendation

def analyze_relationships(df, target_column, correlation):
    """
    Analyze relationships between features and target.
    """
    insights = []
    
    if not target_column or not correlation or target_column not in correlation:
        return insights
        
    try:
        # Get correlations with target
        target_corrs = correlation[target_column]
        
        # Sort by absolute correlation
        sorted_corrs = sorted(
            [(k, v) for k, v in target_corrs.items() if k != target_column and v is not None],
            key=lambda x: abs(x[1]),
            reverse=True
        )
        
        for feat, corr in sorted_corrs[:3]:
            direction = "increases" if corr > 0 else "decreases"
            strength = "strongly" if abs(corr) > 0.7 else "moderately" if abs(corr) > 0.3 else "weakly"
            insights.append(f"Target {strength} {direction} as '{feat}' increases (Corr: {corr:.2f}).")
            
    except Exception:
        pass
        
    return insights

def perform_eda(file_path, target_column=None):
    try:
        # OPTIMIZATION: Read only a subset of data for EDA to prevent system freeze
        # 5,000 rows is sufficient for statistical summary and correlation analysis
        df = pd.read_csv(file_path, nrows=5000)
        
        # Basic Info
        description = df.describe(include='all')
        # Replace Inf/NaN with None in description
        description = description.replace([np.inf, -np.inf], np.nan)
        description = description.astype(object).where(pd.notnull(description), None).to_dict()
        
        missing_values = df.isnull().sum().to_dict()
        dtypes = df.dtypes.astype(str).to_dict()
        
        # 1. Handle Missing Values & Encode Categoricals (for Analysis)
        df_clean = df.copy()
        cleaning_suggestions = []
        preprocessing_steps = []
        features_kept = []
        
        # Track initial columns
        initial_columns = df.columns.tolist()

        for col in df_clean.columns:
            # Missing Values
            if df_clean[col].isnull().sum() > 0:
                if pd.api.types.is_numeric_dtype(df_clean[col]):
                    df_clean[col] = df_clean[col].fillna(df_clean[col].mean())
                    cleaning_suggestions.append(f"Imputed missing values in '{col}' with mean.")
                    preprocessing_steps.append({"step": "Imputation", "details": f"Filled missing '{col}' with mean"})
                else:
                    mode_val = df_clean[col].mode()
                    if not mode_val.empty:
                        df_clean[col] = df_clean[col].fillna(mode_val[0])
                        cleaning_suggestions.append(f"Imputed missing values in '{col}' with mode.")
                        preprocessing_steps.append({"step": "Imputation", "details": f"Filled missing '{col}' with mode"})
                    else:
                        cleaning_suggestions.append(f"Could not impute '{col}' (all values missing).")
            
            # Encoding (for correlation)
            if df_clean[col].dtype == 'object':
                 # Check cardinality
                 if df_clean[col].nunique() < 50 or col == target_column:
                     df_clean[col] = df_clean[col].astype('category').cat.codes
                     preprocessing_steps.append({"step": "Encoding", "details": f"Label Encoded '{col}'"})
                 else:
                     # Drop high cardinality columns for correlation analysis to avoid noise
                     df_clean = df_clean.drop(columns=[col])
                     preprocessing_steps.append({"step": "Drop", "details": f"Dropped '{col}' due to high cardinality (>50 categories)"})
                     continue

            features_kept.append(col)

        # 2. Correlation Matrix (Now includes encoded categoricals)
        # We use the cleaned dataframe for correlation
        numeric_df = df_clean.select_dtypes(include=[np.number])
        correlation = {}
        if not numeric_df.empty:
            corr_df = numeric_df.corr()
            # Round for cleaner JSON and handle NaNs/Infs
            corr_df = corr_df.round(2)
            corr_df = corr_df.replace([np.inf, -np.inf], np.nan)
            correlation = corr_df.astype(object).where(pd.notnull(corr_df), None).to_dict()

        # Target Analysis & Model Recommendation
        target_analysis = {}
        model_recommendation = {}
        key_relationships = []
        
        if target_column and target_column in df.columns:
            target_data = df[target_column]
            
            # Determine Task Type (Reuse logic from train.py ideally, but simplified here)
            is_numeric = pd.api.types.is_numeric_dtype(target_data)
            
            # Try to coerce to numeric if object
            if not is_numeric:
                target_numeric = pd.to_numeric(target_data, errors='coerce')
                if target_numeric.notna().sum() / len(target_data) > 0.9:
                    is_numeric = True
                    target_data = target_numeric

            if is_numeric and target_data.nunique() > 20:
                target_type = "Regression"
            else:
                target_type = "Classification"
                if not is_numeric:
                     # Limit to top 20 classes to avoid huge JSON
                    target_analysis["class_distribution"] = target_data.value_counts().head(20).to_dict()
            
            target_analysis["type"] = target_type
            
            # Recommend Model
            model_recommendation = recommend_model(df_clean, target_column, target_type, correlation)
            
            # Analyze Relationships
            key_relationships = analyze_relationships(df_clean, target_column, correlation)

        cleaned_description = df_clean.describe(include='all')
        cleaned_description = cleaned_description.replace([np.inf, -np.inf], np.nan)
        cleaned_description = cleaned_description.astype(object).where(pd.notnull(cleaned_description), None).to_dict()

        result = {
            "description": description,
            "missing_values": missing_values,
            "dtypes": dtypes,
            "correlation": correlation,
            "target_analysis": target_analysis,
            "cleaning_suggestions": cleaning_suggestions,
            "preprocessing_steps": preprocessing_steps,
            "features_kept": features_kept,
            "cleaned_summary": cleaned_description,
            "columns": df.columns.tolist(),
            "model_recommendation": model_recommendation,
            "key_relationships": key_relationships
        }
        
        print(json.dumps(result, cls=NpEncoder))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, help="Path or URL to the CSV file")
    parser.add_argument("--target", required=False, help="Target column name")
    args = parser.parse_args()
    
    perform_eda(args.file, args.target)
