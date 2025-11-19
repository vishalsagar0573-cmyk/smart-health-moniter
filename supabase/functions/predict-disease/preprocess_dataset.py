"""
Dataset Preprocessing Script
Loads, validates, and preprocesses the medical dataset for training
"""

import pandas as pd
import numpy as np
import json
from sklearn.model_selection import train_test_split

def load_dataset(filename='dataset.csv'):
    """Load dataset from CSV or JSON file"""
    print(f"Loading dataset from {filename}...")
    
    if filename.endswith('.csv'):
        df = pd.read_csv(filename)
    elif filename.endswith('.json'):
        with open(filename, 'r') as f:
            data = json.load(f)
        df = pd.DataFrame(data)
    else:
        raise ValueError("Unsupported file format. Use .csv or .json")
    
    print(f"[OK] Loaded {len(df)} samples")
    print(f"   Features: {len(df.columns) - 1}")
    print(f"   Diseases: {df['disease_id'].nunique()}")
    
    return df

def validate_dataset(df):
    """Validate dataset quality"""
    print("\nValidating dataset...")
    issues = []
    
    # Check for missing values
    missing = df.isnull().sum()
    if missing.any():
        issues.append(f"Missing values found: {missing[missing > 0].to_dict()}")
    
    # Check for invalid symptom values (should be 0 or 1)
    symptom_cols = [col for col in df.columns if col != 'disease_id']
    for col in symptom_cols:
        invalid = df[~df[col].isin([0, 1])]
        if len(invalid) > 0:
            issues.append(f"Invalid values in {col}: {invalid[col].unique()}")
    
    # Check disease_id range
    if df['disease_id'].min() < 0 or df['disease_id'].max() > 7:
        issues.append(f"Invalid disease_id range: {df['disease_id'].min()} to {df['disease_id'].max()}")
    
    # Check for samples with no symptoms
    symptom_sums = df[symptom_cols].sum(axis=1)
    no_symptoms = df[symptom_sums == 0]
    if len(no_symptoms) > 0:
        issues.append(f"Samples with no symptoms: {len(no_symptoms)}")
    
    if issues:
        print("[WARNING] Validation issues found:")
        for issue in issues:
            print(f"   - {issue}")
        return False
    else:
        print("[OK] Dataset validation passed")
        return True

def handle_missing_values(df):
    """Handle missing values in dataset"""
    print("\nHandling missing values...")
    
    # For symptom columns, fill with 0 (symptom not present)
    symptom_cols = [col for col in df.columns if col != 'disease_id']
    df[symptom_cols] = df[symptom_cols].fillna(0)
    
    # For disease_id, drop rows with missing values
    initial_count = len(df)
    df = df.dropna(subset=['disease_id'])
    dropped = initial_count - len(df)
    
    if dropped > 0:
        print(f"   Dropped {dropped} rows with missing disease_id")
    
    print(f"[OK] Dataset after handling missing values: {len(df)} samples")
    return df

def balance_classes(df, method='oversample'):
    """Balance dataset classes if needed"""
    print("\nChecking class balance...")
    
    disease_counts = df['disease_id'].value_counts().sort_index()
    min_count = disease_counts.min()
    max_count = disease_counts.max()
    imbalance_ratio = max_count / min_count
    
    print(f"   Min samples per class: {min_count}")
    print(f"   Max samples per class: {max_count}")
    print(f"   Imbalance ratio: {imbalance_ratio:.2f}")
    
    if imbalance_ratio > 1.5:  # Significant imbalance
        print(f"[WARNING] Class imbalance detected (ratio > 1.5)")
        
        if method == 'oversample':
            print("   Applying oversampling to balance classes...")
            # Oversample minority classes to match majority
            target_count = max_count
            balanced_dfs = []
            
            for disease_id in disease_counts.index:
                disease_df = df[df['disease_id'] == disease_id]
                current_count = len(disease_df)
                
                if current_count < target_count:
                    # Oversample
                    n_samples_needed = target_count - current_count
                    oversampled = disease_df.sample(n=n_samples_needed, replace=True, random_state=42)
                    balanced_dfs.append(pd.concat([disease_df, oversampled]))
                else:
                    balanced_dfs.append(disease_df)
            
            df = pd.concat(balanced_dfs, ignore_index=True)
            print(f"[OK] Balanced dataset: {len(df)} samples")
            
        elif method == 'undersample':
            print("   Applying undersampling to balance classes...")
            # Undersample majority classes to match minority
            target_count = min_count
            balanced_dfs = []
            
            for disease_id in disease_counts.index:
                disease_df = df[df['disease_id'] == disease_id]
                if len(disease_df) > target_count:
                    disease_df = disease_df.sample(n=target_count, random_state=42)
                balanced_dfs.append(disease_df)
            
            df = pd.concat(balanced_dfs, ignore_index=True)
            print(f"[OK] Balanced dataset: {len(df)} samples")
    else:
        print("[OK] Classes are reasonably balanced")
    
    return df

def prepare_features_labels(df):
    """Prepare features (X) and labels (y) from dataset with feature engineering"""
    print("\nPreparing features and labels with feature engineering...")
    
    # Base symptom features (all columns except disease_id and symptom_count)
    base_features = [col for col in df.columns 
                    if col not in ['disease_id', 'symptom_count']]
    base_features.sort()  # Sort for consistency
    
    # Create feature-engineered dataset
    df_engineered = df[base_features].copy()
    
    # Feature Engineering: Add new features
    print("   Adding engineered features...")
    
    # 1. Symptom count (already in dataset, but ensure it's included)
    if 'symptom_count' in df.columns:
        df_engineered['symptom_count'] = df['symptom_count']
    else:
        # Calculate symptom count if not present
        df_engineered['symptom_count'] = df[base_features].sum(axis=1)
    
    # 2. Symptom co-occurrence patterns (interaction features)
    # Fever + Diarrhea (common in many diseases)
    df_engineered['fever_diarrhea'] = (df['fever'] * df['diarrhea']).astype(int)
    
    # Diarrhea + Vomiting (gastrointestinal issues)
    df_engineered['diarrhea_vomiting'] = (df['diarrhea'] * df['vomiting']).astype(int)
    
    # Jaundice + Dark Urine (liver issues - Hepatitis A)
    df_engineered['jaundice_dark_urine'] = (df['jaundice'] * df['dark_urine']).astype(int)
    
    # Diarrhea + Blood Stool (dysentery indicator)
    df_engineered['diarrhea_blood_stool'] = (df['diarrhea'] * df['blood_stool']).astype(int)
    
    # Fever + Headache (common in infections)
    df_engineered['fever_headache'] = (df['fever'] * df['headache']).astype(int)
    
    # Dehydration + Diarrhea (severe dehydration risk)
    df_engineered['dehydration_diarrhea'] = (df['dehydration'] * df['diarrhea']).astype(int)
    
    # Stomach Pain + Nausea (gastrointestinal)
    df_engineered['stomach_pain_nausea'] = (df['stomach_pain'] * df['nausea']).astype(int)
    
    # Fever + Body Pain (infection indicator)
    df_engineered['fever_body_pain'] = (df['fever'] * df['body_pain']).astype(int)
    
    # 3. Symptom intensity scores (weighted combinations)
    # Gastrointestinal symptom score
    gi_symptoms = ['diarrhea', 'vomiting', 'nausea', 'stomach_pain']
    df_engineered['gi_score'] = df[gi_symptoms].sum(axis=1)
    
    # Systemic symptom score
    systemic_symptoms = ['fever', 'weakness', 'headache', 'body_pain']
    df_engineered['systemic_score'] = df[systemic_symptoms].sum(axis=1)
    
    # Severe symptom indicator (high-risk symptoms)
    severe_symptoms = ['blood_stool', 'jaundice', 'dehydration']
    df_engineered['severe_symptom_count'] = df[severe_symptoms].sum(axis=1)
    
    # Get final feature names
    feature_names = list(df_engineered.columns)
    feature_names.sort()  # Sort for consistency
    
    # Extract features and labels
    X = df_engineered.values
    y = df['disease_id'].values
    
    print(f"[OK] Features shape: {X.shape}")
    print(f"[OK] Labels shape: {y.shape}")
    print(f"   Base features: {len(base_features)}")
    print(f"   Engineered features: {len(feature_names) - len(base_features)}")
    print(f"   Total features: {len(feature_names)}")
    print(f"   Feature names: {feature_names[:5]}... (showing first 5)")
    
    return X, y, feature_names

def split_dataset(X, y, test_size=0.2, random_state=42):
    """Split dataset into train and test sets"""
    print(f"\nSplitting dataset (test_size={test_size})...")
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )
    
    print(f"[OK] Training set: {len(X_train)} samples")
    print(f"[OK] Test set: {len(X_test)} samples")
    
    return X_train, X_test, y_train, y_test

def preprocess_dataset(filename='dataset.csv', balance=True, test_size=0.2):
    """
    Complete preprocessing pipeline
    """
    print("=" * 60)
    print("DATASET PREPROCESSING")
    print("=" * 60)
    
    # Load dataset
    df = load_dataset(filename)
    
    # Validate
    if not validate_dataset(df):
        print("⚠️  Validation failed, attempting to fix...")
        df = handle_missing_values(df)
        if not validate_dataset(df):
            raise ValueError("Dataset validation failed after fixing missing values")
    
    # Handle missing values
    df = handle_missing_values(df)
    
    # Balance classes if needed
    if balance:
        df = balance_classes(df, method='oversample')
    
    # Prepare features and labels
    X, y, feature_names = prepare_features_labels(df)
    
    # Split dataset
    X_train, X_test, y_train, y_test = split_dataset(X, y, test_size=test_size)
    
    print("\n" + "=" * 60)
    print("PREPROCESSING COMPLETE")
    print("=" * 60)
    
    return {
        'X_train': X_train,
        'X_test': X_test,
        'y_train': y_train,
        'y_test': y_test,
        'feature_names': feature_names,
        'df': df
    }

if __name__ == "__main__":
    # Test preprocessing
    result = preprocess_dataset('dataset.csv', balance=True, test_size=0.2)
    
    print(f"\nPreprocessed dataset summary:")
    print(f"  Training samples: {len(result['X_train'])}")
    print(f"  Test samples: {len(result['X_test'])}")
    print(f"  Features: {len(result['feature_names'])}")
    print(f"  Classes: {len(np.unique(result['y_train']))}")

