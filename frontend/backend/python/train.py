import warnings
import pandas as pd
import numpy as np
import argparse
import json
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error, accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

# Filter warnings
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

# Regression Models
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor
from sklearn.svm import SVR, SVC

# Classification Models
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neighbors import KNeighborsClassifier
from xgboost import XGBClassifier

class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)

def train_models(file_path, target_column):
    try:
        # OPTIMIZATION: Read only a subset of data to prevent memory crash
        # We read slightly more than we need for sampling to get a good distribution, 
        # but limit it to 10000 to keep RAM usage low.
        df = pd.read_csv(file_path, nrows=10000)
        
        # 1. Preprocessing
        # Drop rows where target is missing
        df = df.dropna(subset=[target_column])

        # Sample data if too large (though nrows limits it, this ensures exactly 3000 if available)
        # Reduced to 3000 to prevent system crash on low-resource machines
        if len(df) > 3000:
            df = df.sample(n=3000, random_state=42)

        
        # Separate features and target
        X = df.drop(columns=[target_column])
        y = df[target_column]

        # --- IMPROVED TASK DETECTION ---
        # Attempt to convert target to numeric
        y_numeric = pd.to_numeric(y, errors='coerce')
        
        # Check if a significant portion is numeric (e.g., > 90%)
        # This handles cases where a few bad values make the whole column an object
        numeric_ratio = y_numeric.notna().sum() / len(y)
        
        is_regression = False
        if numeric_ratio > 0.9:
            # It's likely numeric. Update y to be the numeric version and drop NaNs
            valid_indices = y_numeric.notna()
            y = y_numeric[valid_indices]
            X = X.loc[valid_indices]
            
            # Heuristic: If numeric and high cardinality -> Regression
            # If numeric but low cardinality (e.g. 0, 1) -> Classification
            if y.nunique() > 20: 
                is_regression = True
        
        # -------------------------------

        # --- OUTLIER REMOVAL (Numeric Features Only) ---
        # Using Z-score method (threshold = 3)
        # Only apply if dataset size allows (don't remove too much data)
        if len(X) > 100:
            numeric_features = X.select_dtypes(include=[np.number]).columns
            if len(numeric_features) > 0:
                from scipy import stats
                # Calculate Z-scores
                z_scores = np.abs(stats.zscore(X[numeric_features].fillna(X[numeric_features].mean())))
                # Filter rows where all z-scores are < 3
                # We use a lenient filter: remove row only if it has an outlier in ANY column? 
                # Or maybe just extreme outliers. Let's be conservative: remove if > 3 in ANY column.
                # But to be safe with small data, let's only remove if z > 4 or use IQR.
                
                # Let's use a robust IQR method for better safety
                Q1 = X[numeric_features].quantile(0.25)
                Q3 = X[numeric_features].quantile(0.75)
                IQR = Q3 - Q1
                
                # Define bounds (using 3.0 IQR for extreme outliers only, to avoid data loss)
                lower_bound = Q1 - 3.0 * IQR
                upper_bound = Q3 + 3.0 * IQR
                
                # Create mask
                mask = ~((X[numeric_features] < lower_bound) | (X[numeric_features] > upper_bound)).any(axis=1)
                
                # Apply mask if we don't lose too much data (> 80% kept)
                if mask.sum() / len(X) > 0.8:
                    X = X[mask]
                    y = y[mask]
                    print(f"Removed {len(mask) - mask.sum()} outliers using IQR.", flush=True)
        # -----------------------------------------------
        
        # Impute missing values in features
        num_cols = X.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = X.select_dtypes(include=['object']).columns.tolist()

        # OPTIMIZATION: Drop high cardinality categorical columns to prevent memory explosion
        # If a column has > 50 unique values, it creates too many features after OneHotEncoding
        cols_to_drop = []
        for col in cat_cols:
            if X[col].nunique() > 50:
                cols_to_drop.append(col)
        
        if cols_to_drop:
            print(f"Dropping high cardinality columns: {cols_to_drop}", flush=True)
            X = X.drop(columns=cols_to_drop)
            for col in cols_to_drop:
                cat_cols.remove(col)
        
        from sklearn.compose import ColumnTransformer
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import OneHotEncoder
        from sklearn.feature_selection import SelectFromModel, VarianceThreshold
        
        # Define transformers
        numeric_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='mean')),
            ('scaler', StandardScaler())
        ])
        
        categorical_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='most_frequent')),
            ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])
        
        # Combine transformers
        preprocessor_steps = [
            ('num', numeric_transformer, num_cols),
            ('cat', categorical_transformer, cat_cols)
        ]
        
        preprocessor = ColumnTransformer(
            transformers=preprocessor_steps,
            verbose_feature_names_out=False
        )

        # --- FEATURE SELECTION ---
        # 1. Variance Threshold (remove constant features)
        # 2. Model-based selection (Lasso for Regression, RF for Classification)
        
        selection_step = None
        if is_regression:
             selection_step = SelectFromModel(Lasso(alpha=0.01, random_state=42))
        else:
             selection_step = SelectFromModel(RandomForestClassifier(n_estimators=50, random_state=42))
             
        # Create a full pipeline including feature selection
        # Note: We can't easily put this in the final pipeline object if we want to save just the preprocessor 
        # for prediction (unless we include selection in prediction too, which is good practice).
        # However, SelectFromModel depends on the target 'y' during fit, so it's part of the training pipeline.
        
        # Let's wrap the preprocessor and selector
        full_pipeline = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('variance_threshold', VarianceThreshold(threshold=0.0)), # Remove constant features
            ('feature_selection', selection_step)
        ])

        
        # 2. Define Models based on Task Type
        if is_regression:
            task_type = "Regression"
            models = {
                "Linear Regression": LinearRegression(),
                "Ridge Regression": Ridge(),
                "Lasso Regression": Lasso(),
                "Random Forest Regressor": RandomForestRegressor(n_estimators=50, max_depth=10, n_jobs=1, random_state=42),
                "Gradient Boosting Regressor": GradientBoostingRegressor(n_estimators=50, max_depth=5, random_state=42),
                "XGBoost Regressor": XGBRegressor(n_estimators=50, max_depth=6, n_jobs=1, random_state=42),
                "Support Vector Regressor (SVR)": SVR(kernel='rbf', max_iter=2000)
            }
        else:
            task_type = "Classification"
            # Encode target if categorical (or if it was numeric but low cardinality treated as class)
            # Note: If it was already numeric (0, 1), LabelEncoder will just keep it as is or re-map it 0->0, 1->1
            le_target = LabelEncoder()
            y = le_target.fit_transform(y)
                
            models = {
                "Logistic Regression": LogisticRegression(max_iter=500, n_jobs=1),
                "Decision Tree Classifier": DecisionTreeClassifier(max_depth=10),
                "Random Forest Classifier": RandomForestClassifier(n_estimators=50, max_depth=10, n_jobs=1, random_state=42),
                "Gradient Boosting Classifier": GradientBoostingClassifier(n_estimators=50, max_depth=5, random_state=42),
                "XGBoost Classifier": XGBClassifier(eval_metric='logloss', n_estimators=50, max_depth=6, n_jobs=1, random_state=42),
                "KNN Classifier": KNeighborsClassifier(n_neighbors=5, n_jobs=1),
                "Support Vector Classifier (SVC)": SVC(kernel='rbf', probability=True, max_iter=2000)
            }

        # Split Data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Fit and Transform Data using Preprocessor
        # We fit on train, transform on both
        # Use full_pipeline which includes feature selection
        X_train = full_pipeline.fit_transform(X_train, y_train)
        X_test = full_pipeline.transform(X_test)
        
        results = {}
        best_model_name = ""
        best_score = -float('inf')
        best_model_obj = None
        
        # 3. Train Models
        total_models = len(models)
        for i, (name, model) in enumerate(models.items()):
            # Report Progress
            progress = int((i / total_models) * 100)
            print(f"PROGRESS: {progress}", flush=True)
            
            try:
                model.fit(X_train, y_train)
                y_pred = model.predict(X_test)
                
                metrics = {}
                if task_type == "Regression":
                    r2 = r2_score(y_test, y_pred)
                    metrics["R2"] = r2
                    metrics["MAE"] = mean_absolute_error(y_test, y_pred)
                    metrics["MSE"] = mean_squared_error(y_test, y_pred)
                    metrics["RMSE"] = np.sqrt(metrics["MSE"])
                    
                    score = r2
                else:
                    acc = accuracy_score(y_test, y_pred)
                    metrics["Accuracy"] = acc
                    metrics["Precision"] = precision_score(y_test, y_pred, average='weighted', zero_division=0)
                    metrics["Recall"] = recall_score(y_test, y_pred, average='weighted', zero_division=0)
                    metrics["F1"] = f1_score(y_test, y_pred, average='weighted', zero_division=0)
                    metrics["Confusion Matrix"] = confusion_matrix(y_test, y_pred).tolist()
                    
                    score = acc
                
                results[name] = metrics
                
                if score > best_score:
                    best_score = score
                    best_model_name = name
                    best_model_obj = model
                    
            except Exception as e:
                results[name] = {"error": str(e)}

        # Final Progress
        print("PROGRESS: 100", flush=True)

        # 4. Save Best Model
        model_filename = f"best_model_{task_type}_{best_model_name.replace(' ', '_')}.pkl"
        joblib.dump(best_model_obj, model_filename)
        
        # Also save the preprocessor for prediction later!
        # We save the full_pipeline as 'preprocessor' to maintain compatibility with predict.py
        joblib.dump(full_pipeline, "preprocessor.pkl") 
        
        final_artifact = {
            "model": best_model_obj,
            "preprocessor": full_pipeline,
            "task_type": task_type,
            "target_encoder": le_target if 'le_target' in locals() else None
        }
        joblib.dump(final_artifact, model_filename)

        # Helper to replace NaNs with None for valid JSON
        def clean_nans(obj):
            if isinstance(obj, float):
                return None if np.isnan(obj) or np.isinf(obj) else obj
            if isinstance(obj, dict):
                return {k: clean_nans(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [clean_nans(v) for v in obj]
            return obj

        # Generate Visualization Data (Sample 100 points from best model predictions)
        visualization_data = []
        try:
            # We need to re-predict with best model on test set to get the specific preds
            # (or we could have stored them, but re-predicting is cheap for 600 rows)
            best_preds = best_model_obj.predict(X_test)
            
            # Create a dataframe for sampling
            viz_df = pd.DataFrame({'Actual': y_test, 'Predicted': best_preds})
            
            # Sample 100 points (or less if test set is small)
            if len(viz_df) > 100:
                viz_df = viz_df.sample(n=100, random_state=42)
            
            visualization_data = viz_df.to_dict(orient='records')
        except Exception as e:
            print(f"Visualization data generation failed: {e}", flush=True)

        output = {
            "task_type": task_type,
            "results": results,
            "best_model": best_model_name,
            "best_score": best_score,
            "model_path": os.path.abspath(model_filename),
            "visualization_data": visualization_data
        }
        
        # Clean output
        output = clean_nans(output)
        
        print(json.dumps(output, cls=NpEncoder))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, help="Path or URL to the CSV file")
    parser.add_argument("--target", required=True, help="Target column name")
    args = parser.parse_args()
    
    train_models(args.file, args.target)
