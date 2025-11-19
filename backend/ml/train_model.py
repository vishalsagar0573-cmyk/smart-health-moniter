"""
Random Forest Disease Prediction Model Training Script
Train this model on symptom-disease dataset using real medical data
Requirements: pip install scikit-learn numpy pandas
"""

import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV, RandomizedSearchCV
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support
from preprocess_dataset import preprocess_dataset

# Generate synthetic training data based on disease-symptom patterns
def generate_training_data(n_samples=300):
    print("Generating synthetic symptom-disease training data...")
    np.random.seed(42)
    data = []
    
    # Cholera / Acute Gastroenteritis (High Risk)
    for _ in range(int(n_samples * 0.15)):
        data.append({
            'diarrhea': 1,
            'vomiting': np.random.choice([0, 1], p=[0.2, 0.8]),
            'fever': np.random.choice([0, 1], p=[0.4, 0.6]),
            'stomach_pain': np.random.choice([0, 1], p=[0.5, 0.5]),
            'nausea': np.random.choice([0, 1], p=[0.4, 0.6]),
            'weakness': np.random.choice([0, 1], p=[0.3, 0.7]),
            'headache': np.random.choice([0, 1], p=[0.6, 0.4]),
            'jaundice': 0,
            'dark_urine': 0,
            'dehydration': np.random.choice([0, 1], p=[0.2, 0.8]),
            'rash': 0,
            'body_pain': np.random.choice([0, 1], p=[0.7, 0.3]),
            'blood_stool': 0,
            'loss_appetite': np.random.choice([0, 1], p=[0.5, 0.5]),
            'disease': 0  # Cholera
        })
    
    # Typhoid Fever (Moderate Risk)
    for _ in range(int(n_samples * 0.15)):
        data.append({
            'diarrhea': np.random.choice([0, 1], p=[0.5, 0.5]),
            'vomiting': np.random.choice([0, 1], p=[0.7, 0.3]),
            'fever': 1,
            'stomach_pain': 1,
            'nausea': np.random.choice([0, 1], p=[0.4, 0.6]),
            'weakness': np.random.choice([0, 1], p=[0.3, 0.7]),
            'headache': np.random.choice([0, 1], p=[0.2, 0.8]),
            'jaundice': 0,
            'dark_urine': 0,
            'dehydration': np.random.choice([0, 1], p=[0.6, 0.4]),
            'rash': 0,
            'body_pain': np.random.choice([0, 1], p=[0.5, 0.5]),
            'blood_stool': 0,
            'loss_appetite': np.random.choice([0, 1], p=[0.2, 0.8]),
            'disease': 1  # Typhoid
        })
    
    # Hepatitis A (High Risk)
    for _ in range(int(n_samples * 0.12)):
        data.append({
            'diarrhea': np.random.choice([0, 1], p=[0.7, 0.3]),
            'vomiting': np.random.choice([0, 1], p=[0.6, 0.4]),
            'fever': np.random.choice([0, 1], p=[0.3, 0.7]),
            'stomach_pain': np.random.choice([0, 1], p=[0.5, 0.5]),
            'nausea': np.random.choice([0, 1], p=[0.3, 0.7]),
            'weakness': np.random.choice([0, 1], p=[0.2, 0.8]),
            'headache': np.random.choice([0, 1], p=[0.6, 0.4]),
            'jaundice': 1,
            'dark_urine': np.random.choice([0, 1], p=[0.2, 0.8]),
            'dehydration': np.random.choice([0, 1], p=[0.6, 0.4]),
            'rash': 0,
            'body_pain': np.random.choice([0, 1], p=[0.6, 0.4]),
            'blood_stool': 0,
            'loss_appetite': np.random.choice([0, 1], p=[0.2, 0.8]),
            'disease': 2  # Hepatitis A
        })
    
    # Bacterial Dysentery (High Risk)
    for _ in range(int(n_samples * 0.12)):
        data.append({
            'diarrhea': 1,
            'vomiting': np.random.choice([0, 1], p=[0.5, 0.5]),
            'fever': np.random.choice([0, 1], p=[0.3, 0.7]),
            'stomach_pain': np.random.choice([0, 1], p=[0.2, 0.8]),
            'nausea': np.random.choice([0, 1], p=[0.6, 0.4]),
            'weakness': np.random.choice([0, 1], p=[0.4, 0.6]),
            'headache': np.random.choice([0, 1], p=[0.7, 0.3]),
            'jaundice': 0,
            'dark_urine': 0,
            'dehydration': np.random.choice([0, 1], p=[0.4, 0.6]),
            'rash': 0,
            'body_pain': np.random.choice([0, 1], p=[0.6, 0.4]),
            'blood_stool': 1,
            'loss_appetite': np.random.choice([0, 1], p=[0.5, 0.5]),
            'disease': 3  # Dysentery
        })
    
    # Water-related Skin Infection (Low Risk)
    for _ in range(int(n_samples * 0.10)):
        data.append({
            'diarrhea': 0,
            'vomiting': 0,
            'fever': np.random.choice([0, 1], p=[0.7, 0.3]),
            'stomach_pain': 0,
            'nausea': 0,
            'weakness': np.random.choice([0, 1], p=[0.6, 0.4]),
            'headache': np.random.choice([0, 1], p=[0.8, 0.2]),
            'jaundice': 0,
            'dark_urine': 0,
            'dehydration': 0,
            'rash': 1,
            'body_pain': np.random.choice([0, 1], p=[0.5, 0.5]),
            'blood_stool': 0,
            'loss_appetite': 0,
            'disease': 4  # Skin Infection
        })
    
    # Malaria / General Infection (Moderate Risk)
    for _ in range(int(n_samples * 0.12)):
        data.append({
            'diarrhea': np.random.choice([0, 1], p=[0.7, 0.3]),
            'vomiting': np.random.choice([0, 1], p=[0.7, 0.3]),
            'fever': 1,
            'stomach_pain': np.random.choice([0, 1], p=[0.6, 0.4]),
            'nausea': np.random.choice([0, 1], p=[0.5, 0.5]),
            'weakness': np.random.choice([0, 1], p=[0.2, 0.8]),
            'headache': np.random.choice([0, 1], p=[0.2, 0.8]),
            'jaundice': 0,
            'dark_urine': 0,
            'dehydration': np.random.choice([0, 1], p=[0.6, 0.4]),
            'rash': 0,
            'body_pain': 1,
            'blood_stool': 0,
            'loss_appetite': np.random.choice([0, 1], p=[0.5, 0.5]),
            'disease': 5  # Malaria
        })
    
    # Acute Diarrheal Disease (Moderate Risk)
    for _ in range(int(n_samples * 0.12)):
        data.append({
            'diarrhea': 1,
            'vomiting': np.random.choice([0, 1], p=[0.5, 0.5]),
            'fever': np.random.choice([0, 1], p=[0.6, 0.4]),
            'stomach_pain': np.random.choice([0, 1], p=[0.3, 0.7]),
            'nausea': np.random.choice([0, 1], p=[0.4, 0.6]),
            'weakness': np.random.choice([0, 1], p=[0.3, 0.7]),
            'headache': np.random.choice([0, 1], p=[0.7, 0.3]),
            'jaundice': 0,
            'dark_urine': 0,
            'dehydration': np.random.choice([0, 1], p=[0.3, 0.7]),
            'rash': 0,
            'body_pain': np.random.choice([0, 1], p=[0.7, 0.3]),
            'blood_stool': 0,
            'loss_appetite': np.random.choice([0, 1], p=[0.5, 0.5]),
            'disease': 6  # Acute Diarrhea
        })
    
    # Gastroenteritis (Moderate Risk)
    for _ in range(int(n_samples * 0.12)):
        data.append({
            'diarrhea': np.random.choice([0, 1], p=[0.3, 0.7]),
            'vomiting': np.random.choice([0, 1], p=[0.2, 0.8]),
            'fever': np.random.choice([0, 1], p=[0.5, 0.5]),
            'stomach_pain': 1,
            'nausea': 1,
            'weakness': np.random.choice([0, 1], p=[0.4, 0.6]),
            'headache': np.random.choice([0, 1], p=[0.6, 0.4]),
            'jaundice': 0,
            'dark_urine': 0,
            'dehydration': np.random.choice([0, 1], p=[0.5, 0.5]),
            'rash': 0,
            'body_pain': np.random.choice([0, 1], p=[0.7, 0.3]),
            'blood_stool': 0,
            'loss_appetite': np.random.choice([0, 1], p=[0.4, 0.6]),
            'disease': 7  # Gastroenteritis
        })
    
    return data

# Export decision tree structure
def export_tree(tree, feature_names):
    tree_ = tree.tree_
    feature_name = [
        feature_names[i] if i != -2 else "undefined!"
        for i in tree_.feature
    ]
    
    def recurse(node, depth=0):
        if tree_.feature[node] != -2:  # Not a leaf
            return {
                'type': 'split',
                'feature': feature_name[node],
                'threshold': float(tree_.threshold[node]),
                'left': recurse(tree_.children_left[node], depth + 1),
                'right': recurse(tree_.children_right[node], depth + 1)
            }
        else:  # Leaf node
            values = tree_.value[node][0]
            return {
                'type': 'leaf',
                'class': int(np.argmax(values)),
                'probabilities': [float(v) for v in values / values.sum()]
            }
    
    return recurse(0)

# Main training pipeline
def train_and_export(dataset_file='dataset.csv', use_real_data=True, output_dir='../supabase/functions/predict-disease'):
    """
    Train and export model
    output_dir: Directory where trained model will be saved (relative to backend/ml/)
    """
    print("=" * 60)
    print("DISEASE PREDICTION RANDOM FOREST TRAINING")
    print("=" * 60)
    
    if use_real_data:
        # Load and preprocess real dataset
        print("\nLoading real medical dataset...")
        try:
            preprocessed = preprocess_dataset(dataset_file, balance=True, test_size=0.2)
            X_train = preprocessed['X_train']
            X_test = preprocessed['X_test']
            y_train = preprocessed['y_train']
            y_test = preprocessed['y_test']
            feature_names = preprocessed['feature_names']
            print(f"[OK] Loaded dataset: {len(X_train)} training, {len(X_test)} test samples")
        except FileNotFoundError:
            print(f"[WARNING] Dataset file '{dataset_file}' not found. Generating synthetic data instead...")
            use_real_data = False
    
    if not use_real_data:
        # Fallback to synthetic data
        print("\nGenerating synthetic training data...")
        training_data = generate_training_data(n_samples=300)
        
        # Prepare features and labels
        feature_names = ['diarrhea', 'vomiting', 'fever', 'stomach_pain', 'nausea', 
                         'weakness', 'headache', 'jaundice', 'dark_urine', 'dehydration',
                         'rash', 'body_pain', 'blood_stool', 'loss_appetite']
        
        X = np.array([[d[feature] for feature in feature_names] for d in training_data])
        y = np.array([d['disease'] for d in training_data])
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print(f"\nTraining samples: {len(X_train)}, Test samples: {len(X_test)}")
    print(f"Features: {len(feature_names)}")
    print(f"Classes: {len(np.unique(y_train))}")
    
    # Hyperparameter tuning for optimal performance
    print("\n" + "=" * 60)
    print("HYPERPARAMETER TUNING")
    print("=" * 60)
    
    # Define parameter grid for tuning
    param_grid = {
        'n_estimators': [100, 150, 200],
        'max_depth': [10, 12, 15, None],
        'min_samples_split': [2, 3, 5],
        'min_samples_leaf': [1, 2],
        'max_features': ['sqrt', 'log2'],
        'class_weight': ['balanced', None]
    }
    
    print("\nPerforming RandomizedSearchCV for hyperparameter optimization...")
    print("   This may take a few minutes...")
    
    # Use RandomizedSearchCV for faster tuning (tests 30 random combinations)
    base_rf = RandomForestClassifier(random_state=42, n_jobs=-1)
    random_search = RandomizedSearchCV(
        base_rf,
        param_distributions=param_grid,
        n_iter=30,  # Test 30 random combinations
        cv=5,  # 5-fold cross-validation
        scoring='accuracy',
        n_jobs=-1,
        random_state=42,
        verbose=1
    )
    
    random_search.fit(X_train, y_train)
    
    print(f"\n[OK] Best parameters found:")
    for param, value in random_search.best_params_.items():
        print(f"   {param}: {value}")
    print(f"   Best CV score: {random_search.best_score_:.4f} ({random_search.best_score_*100:.2f}%)")
    
    # Use best model
    rf = random_search.best_estimator_
    
    print("\nTraining final model with best parameters...")
    rf.fit(X_train, y_train)
    
    # Evaluate
    train_score = rf.score(X_train, y_train)
    test_score = rf.score(X_test, y_test)
    print(f"\nTraining accuracy: {train_score:.3f} ({train_score*100:.1f}%)")
    print(f"Test accuracy: {test_score:.3f} ({test_score*100:.1f}%)")
    
    # Cross-validation with best model
    print("\nPerforming cross-validation on optimized model...")
    cv_scores = cross_val_score(rf, X_train, y_train, cv=5, scoring='accuracy')
    print(f"Cross-validation accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std() * 2:.3f})")
    
    # Additional cross-validation metrics
    from sklearn.model_selection import cross_validate
    cv_results = cross_validate(rf, X_train, y_train, cv=5, 
                                scoring=['accuracy', 'precision_macro', 'recall_macro', 'f1_macro'],
                                return_train_score=True)
    
    print(f"\nDetailed Cross-Validation Results:")
    print(f"   Train Accuracy: {cv_results['train_accuracy'].mean():.3f} (+/- {cv_results['train_accuracy'].std() * 2:.3f})")
    print(f"   Val Accuracy: {cv_results['test_accuracy'].mean():.3f} (+/- {cv_results['test_accuracy'].std() * 2:.3f})")
    print(f"   Val Precision: {cv_results['test_precision_macro'].mean():.3f}")
    print(f"   Val Recall: {cv_results['test_recall_macro'].mean():.3f}")
    print(f"   Val F1: {cv_results['test_f1_macro'].mean():.3f}")
    
    # Predictions
    y_pred = rf.predict(X_test)
    
    # Calculate additional metrics
    precision, recall, f1, support = precision_recall_fscore_support(y_test, y_pred, average=None)
    
    disease_names = [
        'Cholera',
        'Typhoid',
        'Hepatitis A',
        'Dysentery',
        'Skin Infection',
        'Malaria',
        'Acute Diarrhea',
        'Gastroenteritis'
    ]
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=disease_names))
    
    print("\nConfusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(cm)
    
    # Per-disease metrics
    print("\nPer-Disease Metrics:")
    for i, disease_name in enumerate(disease_names):
        if i < len(precision):
            print(f"  {disease_name:20s}: Precision={precision[i]:.3f}, Recall={recall[i]:.3f}, F1={f1[i]:.3f}, Support={support[i]}")
    
    # Disease metadata
    disease_metadata = [
        {
            'id': 0,
            'name': 'Cholera / Acute Gastroenteritis',
            'risk_level': 'High',
            'advice': '🚨 URGENT: Drink boiled water immediately, use ORS (Oral Rehydration Solution), avoid contaminated food/water, and visit the nearest health center IMMEDIATELY. This is a medical emergency.'
        },
        {
            'id': 1,
            'name': 'Typhoid Fever',
            'risk_level': 'Moderate',
            'advice': '⚠️ Take complete rest, avoid street food and untreated water, maintain hygiene, and visit a clinic for proper diagnosis and antibiotics. Monitor temperature regularly.'
        },
        {
            'id': 2,
            'name': 'Hepatitis A',
            'risk_level': 'High',
            'advice': '🚨 URGENT: Avoid contaminated food and water, maintain strict hygiene, rest completely, and see a doctor immediately. Hepatitis A is highly contagious - isolate patient and disinfect surfaces.'
        },
        {
            'id': 3,
            'name': 'Bacterial Dysentery',
            'risk_level': 'High',
            'advice': '🚨 Take ORS immediately, maintain hygiene, avoid solid foods initially, and consult a doctor. Blood in stool requires immediate medical attention.'
        },
        {
            'id': 4,
            'name': 'Water-related Skin Infection',
            'risk_level': 'Low',
            'advice': 'ℹ️ Maintain personal hygiene, avoid contact with dirty water, keep affected area clean and dry, and apply antiseptic. Visit health worker if rash spreads or worsens.'
        },
        {
            'id': 5,
            'name': 'Malaria / General Infection',
            'risk_level': 'Moderate',
            'advice': '⚠️ Sleep under mosquito nets, take prescribed antimalarial medication, drink plenty of fluids, and seek medical help. Monitor fever patterns (intermittent fever is typical of malaria).'
        },
        {
            'id': 6,
            'name': 'Acute Diarrheal Disease',
            'risk_level': 'Moderate',
            'advice': '⚠️ Drink ORS frequently, eat bland foods (rice, banana), maintain hygiene, boil all drinking water, and visit health center if symptoms persist for more than 2 days.'
        },
        {
            'id': 7,
            'name': 'Gastroenteritis',
            'risk_level': 'Moderate',
            'advice': '⚠️ Stay hydrated with ORS, avoid dairy and spicy foods, rest, and maintain hand hygiene. Visit doctor if symptoms worsen or persist beyond 3 days.'
        }
    ]
    
    # Export trees
    print("\nExporting decision trees...")
    exported_trees = []
    for idx, tree in enumerate(rf.estimators_):
        print(f"Exporting tree {idx + 1}/{len(rf.estimators_)}...")
        exported_trees.append(export_tree(tree, feature_names))
    
    # Calculate overall precision, recall, F1
    precision_macro, recall_macro, f1_macro, _ = precision_recall_fscore_support(y_test, y_pred, average='macro')
    precision_weighted, recall_weighted, f1_weighted, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')
    
    # Check if we've reached target accuracy
    print("\n" + "=" * 60)
    print("ACCURACY TARGET CHECK")
    print("=" * 60)
    if test_score >= 0.80:
        print(f"[SUCCESS] Target accuracy (80%) achieved! Test accuracy: {test_score*100:.2f}%")
    elif test_score >= 0.75:
        print(f"[GOOD] Close to target! Test accuracy: {test_score*100:.2f}% (target: 80%)")
    else:
        print(f"[NOTE] Test accuracy: {test_score*100:.2f}% (target: 80-90%)")
        print("   Consider trying XGBoost or ensemble methods for further improvement")
    
    # Store best hyperparameters
    best_params = random_search.best_params_ if 'random_search' in locals() else {}
    
    model_export = {
        'model_type': 'RandomForestClassifier',
        'n_estimators': rf.n_estimators,
        'feature_names': feature_names,
        'classes': list(range(8)),
        'disease_metadata': disease_metadata,
        'trees': exported_trees,
        'feature_importances': {
            name: float(importance) 
            for name, importance in zip(feature_names, rf.feature_importances_)
        },
        'best_hyperparameters': best_params,
        'training_info': {
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'training_accuracy': float(train_score),
            'test_accuracy': float(test_score),
            'cv_accuracy_mean': float(cv_scores.mean()),
            'cv_accuracy_std': float(cv_scores.std()),
            'precision_macro': float(precision_macro),
            'recall_macro': float(recall_macro),
            'f1_macro': float(f1_macro),
            'precision_weighted': float(precision_weighted),
            'recall_weighted': float(recall_weighted),
            'f1_weighted': float(f1_weighted),
            'dataset_source': 'real' if use_real_data else 'synthetic',
            'dataset_size': len(X_train) + len(X_test),
            'feature_count': len(feature_names),
            'engineered_features': len(feature_names) - 14  # 14 base symptoms
        }
    }
    
    # Save to JSON - save to both local and Supabase function directory
    import os
    output_file_local = 'trained_disease_model.json'
    output_file_supabase = os.path.join(output_dir, 'trained_disease_model.json')
    
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"\nSaving model to {output_file_local} (local)...")
    with open(output_file_local, 'w') as f:
        json.dump(model_export, f, indent=2)
    
    print(f"Saving model to {output_file_supabase} (Supabase function)...")
    with open(output_file_supabase, 'w') as f:
        json.dump(model_export, f, indent=2)
    
    print(f"\n[OK] Model exported successfully")
    print(f"  - Local: {output_file_local}")
    print(f"  - Supabase: {output_file_supabase}")
    print(f"Total trees: {len(model_export['trees'])}")
    print(f"\nModel Performance Summary:")
    print(f"  Test Accuracy: {test_score*100:.2f}%")
    print(f"  Training Accuracy: {train_score*100:.2f}%")
    print(f"  Overfitting Gap: {(train_score - test_score)*100:.2f}%")
    print(f"  CV Accuracy: {cv_scores.mean()*100:.2f}% (+/- {cv_scores.std()*2*100:.2f}%)")
    print(f"\nTop 10 Most Important Features:")
    for name, importance in sorted(model_export['feature_importances'].items(), 
                                   key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {name}: {importance:.3f}")
    
    return model_export

if __name__ == "__main__":
    import sys
    import os
    
    # Check if dataset file is provided as argument
    dataset_file = 'dataset.csv'
    use_real_data = True
    
    if len(sys.argv) > 1:
        dataset_file = sys.argv[1]
    
    if len(sys.argv) > 2 and sys.argv[2] == '--synthetic':
        use_real_data = False
    
    # Calculate output directory (relative to backend/ml/)
    # backend/ml/ -> supabase/functions/predict-disease/
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(current_dir))
    output_dir = os.path.join(project_root, 'supabase', 'functions', 'predict-disease')
    
    train_and_export(dataset_file=dataset_file, use_real_data=use_real_data, output_dir=output_dir)




