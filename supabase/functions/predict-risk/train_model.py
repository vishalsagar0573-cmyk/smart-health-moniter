#!/usr/bin/env python3
"""
Enhanced Risk Prediction Model Training Script
Trains a Random Forest Classifier that considers:
- Symptoms (fever, diarrhea, vomiting)
- Water quality (pH, turbidity)
- Predicted disease from symptom analysis

Output: Trained model exported to trained_model.json
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import json

# Disease encoding for feature vector
DISEASE_ENCODING = {
    'None': 0,
    'Mild_Infection': 1,
    'Food_Poisoning': 2,
    'Viral_Gastroenteritis': 3,
    'Dysentery': 4,
    'Typhoid': 5,
    'Cholera': 6,
    'Hepatitis_A': 7,
    'Severe_Diarrheal_Disease': 8
}

def create_synthetic_dataset(n_samples=300):
    """
    Generate synthetic training data based on real-world patterns
    of water-borne disease outbreaks
    """
    np.random.seed(42)
    data = []
    
    # Pattern 1: Safe conditions
    for _ in range(80):
        data.append({
            'fever': np.random.randint(0, 2),
            'diarrhea': np.random.randint(0, 2),
            'vomiting': np.random.randint(0, 1),
            'pH': np.random.uniform(6.8, 8.2),
            'turbidity': np.random.uniform(0.5, 3.5),
            'disease': np.random.choice(['None', 'Mild_Infection']),
            'risk': 'safe'
        })
    
    # Pattern 2: Moderate risk - some symptoms + borderline water
    for _ in range(100):
        disease_pool = ['Mild_Infection', 'Food_Poisoning', 'Viral_Gastroenteritis', 'Dysentery']
        data.append({
            'fever': np.random.randint(1, 4),
            'diarrhea': np.random.randint(2, 6),
            'vomiting': np.random.randint(1, 4),
            'pH': np.random.uniform(6.2, 8.8),
            'turbidity': np.random.uniform(3.0, 6.5),
            'disease': np.random.choice(disease_pool),
            'risk': 'moderate'
        })
    
    # Pattern 3: High risk - severe symptoms + poor water quality
    for _ in range(120):
        # Cholera cases
        if np.random.random() > 0.5:
            data.append({
                'fever': np.random.randint(3, 8),
                'diarrhea': np.random.randint(6, 15),
                'vomiting': np.random.randint(4, 10),
                'pH': np.random.uniform(5.5, 6.5),
                'turbidity': np.random.uniform(6.0, 15.0),
                'disease': 'Cholera',
                'risk': 'high'
            })
        # Typhoid cases
        elif np.random.random() > 0.5:
            data.append({
                'fever': np.random.randint(5, 12),
                'diarrhea': np.random.randint(3, 8),
                'vomiting': np.random.randint(2, 6),
                'pH': np.random.uniform(5.8, 7.0),
                'turbidity': np.random.uniform(5.0, 12.0),
                'disease': 'Typhoid',
                'risk': 'high'
            })
        # Hepatitis A
        elif np.random.random() > 0.5:
            data.append({
                'fever': np.random.randint(2, 6),
                'diarrhea': np.random.randint(1, 4),
                'vomiting': np.random.randint(2, 5),
                'pH': np.random.uniform(5.5, 6.8),
                'turbidity': np.random.uniform(5.5, 13.0),
                'disease': 'Hepatitis_A',
                'risk': 'high'
            })
        # Severe diarrheal diseases
        else:
            data.append({
                'fever': np.random.randint(4, 10),
                'diarrhea': np.random.randint(8, 20),
                'vomiting': np.random.randint(3, 8),
                'pH': np.random.uniform(5.2, 6.5),
                'turbidity': np.random.uniform(7.0, 18.0),
                'disease': 'Severe_Diarrheal_Disease',
                'risk': 'high'
            })
    
    return pd.DataFrame(data)

def export_tree_structure(tree, feature_names):
    """
    Recursively export decision tree structure to JSON-compatible dict
    """
    tree_ = tree.tree_
    feature_name = [
        feature_names[i] if i != -2 else "undefined"
        for i in tree_.feature
    ]

    def recurse(node):
        if tree_.feature[node] == -2:  # Leaf node
            # Get class probabilities
            value = tree_.value[node][0]
            total = value.sum()
            probabilities = (value / total).tolist() if total > 0 else value.tolist()
            
            return {
                'type': 'leaf',
                'class': int(np.argmax(value)),
                'probabilities': probabilities
            }
        else:  # Split node
            return {
                'type': 'split',
                'feature': feature_name[node],
                'threshold': float(tree_.threshold[node]),
                'left': recurse(tree_.children_left[node]),
                'right': recurse(tree_.children_right[node])
            }
    
    return recurse(0)

def train_and_export_model():
    """
    Main training function
    """
    print("=" * 60)
    print("ENHANCED RISK PREDICTION MODEL TRAINING")
    print("=" * 60)
    
    # Create dataset
    print("\n1. Generating synthetic dataset...")
    df = create_synthetic_dataset(300)
    print(f"   Dataset size: {len(df)} samples")
    print(f"   Risk distribution:")
    print(df['risk'].value_counts().to_dict())
    
    # Encode disease names to numbers
    print("\n2. Encoding disease features...")
    df['disease_encoded'] = df['disease'].map(DISEASE_ENCODING)
    
    # Prepare features and labels
    feature_names = ['fever', 'diarrhea', 'vomiting', 'pH', 'turbidity', 'disease_encoded']
    X = df[feature_names]
    
    # Encode risk levels
    risk_mapping = {'safe': 0, 'moderate': 1, 'high': 2}
    y = df['risk'].map(risk_mapping)
    
    # Split data
    print("\n3. Splitting train/test sets (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"   Training samples: {len(X_train)}")
    print(f"   Test samples: {len(X_test)}")
    
    # Train Random Forest
    print("\n4. Training Random Forest Classifier...")
    print("   Parameters: n_estimators=10, max_depth=8, random_state=42")
    rf = RandomForestClassifier(
        n_estimators=10,
        max_depth=8,
        random_state=42,
        min_samples_split=5,
        min_samples_leaf=2
    )
    rf.fit(X_train, y_train)
    
    # Evaluate
    print("\n5. Evaluating model performance...")
    train_pred = rf.predict(X_train)
    test_pred = rf.predict(X_test)
    
    train_acc = accuracy_score(y_train, train_pred)
    test_acc = accuracy_score(y_test, test_pred)
    
    print(f"   Training Accuracy: {train_acc:.3f} ({train_acc*100:.1f}%)")
    print(f"   Test Accuracy: {test_acc:.3f} ({test_acc*100:.1f}%)")
    
    print("\n   Classification Report (Test Set):")
    print(classification_report(y_test, test_pred, 
                                target_names=['Safe', 'Moderate', 'High'],
                                digits=3))
    
    print("\n   Confusion Matrix:")
    cm = confusion_matrix(y_test, test_pred)
    print("              Pred: Safe  Moderate  High")
    for i, label in enumerate(['Actual Safe', 'Actual Mod ', 'Actual High']):
        print(f"   {label}:    {cm[i][0]:3d}      {cm[i][1]:3d}     {cm[i][2]:3d}")
    
    # Feature importances
    print("\n6. Feature Importances:")
    importances = dict(zip(feature_names, rf.feature_importances_))
    for feat, imp in sorted(importances.items(), key=lambda x: -x[1]):
        print(f"   {feat:20s}: {imp:.4f} ({imp*100:.1f}%)")
    
    # Export trees
    print("\n7. Exporting decision trees...")
    exported_trees = []
    for idx, tree in enumerate(rf.estimators_):
        print(f"   Exporting tree {idx + 1}/{len(rf.estimators_)}...")
        exported_trees.append(export_tree_structure(tree, feature_names))
    
    model_export = {
        'model_type': 'RandomForestClassifier',
        'n_estimators': rf.n_estimators,
        'feature_names': feature_names,
        'classes': [0, 1, 2],
        'class_names': ['safe', 'moderate', 'high'],
        'trees': exported_trees,
        'disease_encoding': DISEASE_ENCODING,
        'feature_importances': {
            name: float(importance) 
            for name, importance in zip(feature_names, rf.feature_importances_)
        },
        'training_info': {
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'training_accuracy': float(train_acc),
            'test_accuracy': float(test_acc)
        }
    }
    
    # Save to JSON
    output_file = 'trained_model.json'
    print(f"\n8. Saving model to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(model_export, f, indent=2)
    
    print(f"\n✅ Model successfully trained and exported!")
    print(f"   Output file: {output_file}")
    print(f"   Model contains {len(exported_trees)} decision trees")
    print(f"   Test accuracy: {test_acc*100:.1f}%")
    print("=" * 60)

if __name__ == "__main__":
    train_and_export_model()
