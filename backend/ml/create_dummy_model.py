from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import numpy as np
import os

# Create dummy model to unblock integration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "opencv", "microorganism_model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "..", "opencv", "scaler.pkl")

# 2 samples: Safe, Unsafe
# Features: pH, Turbidity, Diarrhea, Vomiting, Fever, Skin_Rash, Jaundice, Stomach_Pain
X = np.array([
    [7.0, 0.5, 0, 0, 0, 0, 0, 0],       # Safe
    [5.0, 10.0, 1, 1, 1, 0, 0, 1],      # E. coliish
    [4.0, 1.0, 0, 0, 0, 1, 0, 0],       # Fungi
    [9.5, 1.0, 0, 0, 0, 0, 0, 0]        # Sulfate
])
y = ["None", "E. coli", "Fungi", "Sulfate-Reducing Bacteria"]

# Scale numeric (pH, Turbidity)
scaler = StandardScaler()
X[:, :2] = scaler.fit_transform(X[:, :2])

clf = RandomForestClassifier(n_estimators=10, random_state=42)
clf.fit(X, y)

joblib.dump(clf, MODEL_PATH)
joblib.dump(scaler, SCALER_PATH)
print("Dummy model created successfully.")
