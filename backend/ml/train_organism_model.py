import pandas as pd
import numpy as np
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_FILE = os.path.join(BASE_DIR, "water_disease_dataset.csv")
MODEL_FILE = os.path.join(BASE_DIR, "organism_model_rf.pkl")
ENCODER_FILE = os.path.join(BASE_DIR, "organism_label_encoder.pkl")

def train():
    print("Loading dataset...")
    if not os.path.exists(DATASET_FILE):
        print(f"Error: Dataset {DATASET_FILE} not found. Run dataset_generator.py first.")
        return

    df = pd.read_csv(DATASET_FILE)
    
    # Features and Target
    X = df[["pH", "Turbidity", "Diarrhea", "Vomiting", "Fever", "Skin_Rash", "Jaundice", "Stomach_Pain"]]
    y = df["Label"]
    
    # Encode Target
    # Ensure all are strings and handle NaNs
    df["Label"] = df["Label"].astype(str)
    df["Label"] = df["Label"].replace("nan", "None")
    
    print("Unique labels:", df["Label"].unique())
    
    y = df["Label"]
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)
    
    # Train
    print("Training Random Forest Classifier...")
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    
    # Evaluate
    y_pred = clf.predict(X_test)
    print("Accuracy:", accuracy_score(y_test, y_pred))
    print("\nClassification Report:\n", classification_report(y_test, y_pred, target_names=le.classes_))
    
    # Save
    print("Saving model and encoder...")
    with open(MODEL_FILE, "wb") as f:
        pickle.dump(clf, f)
        
    with open(ENCODER_FILE, "wb") as f:
        pickle.dump(le, f)
        
    print(f"Model saved to {MODEL_FILE}")
    print(f"Encoder saved to {ENCODER_FILE}")

if __name__ == "__main__":
    train()
