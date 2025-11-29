import pandas as pd
import numpy as np
import json
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.model_selection import train_test_split
from sklearn.tree import _tree

def forest_to_json(rf, feature_names, class_names):
    """
    Exports a sklearn RandomForestClassifier to a JSON serializable format.
    """
    estimators_list = []
    
    for estimator in rf.estimators_:
        tree = estimator.tree_
        tree_structure = recurse(tree, 0, class_names)
        estimators_list.append(tree_structure)
        
    return {
        "features": feature_names,
        "classes": class_names,
        "n_estimators": len(rf.estimators_),
        "estimators": estimators_list
    }

def recurse(tree, node, class_names):
    if tree.feature[node] != _tree.TREE_UNDEFINED:
        # Internal Node
        return {
            "type": "split",
            "feature_index": int(tree.feature[node]),
            "threshold": float(tree.threshold[node]),
            "left": recurse(tree, tree.children_left[node], class_names),
            "right": recurse(tree, tree.children_right[node], class_names)
        }
    else:
        # Leaf Node
        # tree.value[node] is shape (1, n_outputs, n_classes) for MultiOutput
        # But for MultiLabel with RandomForestClassifier, it treats it as MultiOutput (one output per label)
        # Wait, sklearn RandomForestClassifier for multilabel usually fits one tree per output or uses MultiOutputClassifier?
        # Actually, RandomForestClassifier supports multilabel natively.
        # In that case, tree.value[node] shape depends on implementation.
        # Let's check how it stores values.
        
        # For standard classification: value is (1, n_classes)
        # For multilabel: It might be complex.
        
        # SIMPLIFICATION:
        # To make it easy to load in JS, we can train OneVsRest or just treat it as independent binary problems?
        # Or we can use the native support.
        # If native support is used, the tree structure is complex.
        
        # ALTERNATIVE:
        # We will train a separate RandomForest for EACH microorganism (Binary Classification).
        # This is much easier to export and reason about in the Edge Function.
        # We will have a dictionary of models: { "Vibrio cholerae": Model, "E. coli": Model, ... }
        pass

# REVISED STRATEGY: Train one RF per label (Binary Relevance)
# This ensures simple tree structures: value is [count_class_0, count_class_1]

def train_and_export():
    # Load Data
    df = pd.read_csv("microorganisms_dataset.csv")
    
    # Preprocess
    # Parse "possible_microorganisms" string to list
    df['possible_microorganisms'] = df['possible_microorganisms'].fillna("None")
    df['microorganisms_list'] = df['possible_microorganisms'].apply(lambda x: str(x).split(',') if str(x) != "None" else [])
    
    # Features
    feature_cols = [
        "diarrhea", "vomiting", "fever", "stomach_pain", "nausea", "weakness",
        "headache", "jaundice", "dark_urine", "dehydration", "rash", 
        "body_pain", "blood_stool", "loss_appetite", "pH", "turbidity"
    ]
    
    X = df[feature_cols]
    y = df['microorganisms_list']
    
    # Binarize Labels
    mlb = MultiLabelBinarizer()
    y_encoded = mlb.fit_transform(y)
    classes = mlb.classes_
    
    print(f"Classes found: {classes}")
    
    full_model_export = {
        "features": feature_cols,
        "models": {}
    }
    
    for i, class_name in enumerate(classes):
        if class_name == "None": continue
        
        print(f"Training model for {class_name}...")
        y_binary = y_encoded[:, i]
        
        # Train simple RF
        rf = RandomForestClassifier(n_estimators=10, max_depth=10, random_state=42) # 10 trees is enough for JS inference speed
        rf.fit(X, y_binary)
        
        # Export this model
        model_json = forest_to_json_binary(rf, feature_cols)
        full_model_export["models"][class_name] = model_json
        
    # Save to JSON
    with open("trained_microorganism_model.json", "w") as f:
        json.dump(full_model_export, f)
        
    print("Model exported to trained_microorganism_model.json")

def forest_to_json_binary(rf, feature_names):
    estimators_list = []
    for estimator in rf.estimators_:
        tree = estimator.tree_
        tree_structure = recurse_binary(tree, 0)
        estimators_list.append(tree_structure)
    return estimators_list

def recurse_binary(tree, node):
    if tree.feature[node] != _tree.TREE_UNDEFINED:
        return {
            "t": "s", # type: split
            "f": int(tree.feature[node]), # feature index
            "v": float(tree.threshold[node]), # value/threshold
            "l": recurse_binary(tree, tree.children_left[node]), # left
            "r": recurse_binary(tree, tree.children_right[node]) # right
        }
    else:
        # Leaf
        # Value is [[count_0, count_1]]
        values = tree.value[node][0]
        prob_1 = values[1] / (values[0] + values[1])
        return {
            "t": "l", # type: leaf
            "v": float(prob_1) # probability of class 1
        }

if __name__ == "__main__":
    train_and_export()
