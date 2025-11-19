# ML Backend - Disease Prediction Model

This directory contains the machine learning backend for disease prediction based on symptoms.

## Structure

- `create_dataset.py` - Generates medical knowledge-based dataset (4,000 samples)
- `preprocess_dataset.py` - Preprocesses and engineers features from dataset
- `train_model.py` - Trains Random Forest model with hyperparameter tuning
- `requirements.txt` - Python dependencies

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Step 1: Generate Dataset
```bash
python create_dataset.py
```
This creates `dataset.csv` and `dataset.json` with 4,000 samples (500 per disease).

### Step 2: Train Model
```bash
python train_model.py dataset.csv
```

This will:
- Load and preprocess the dataset
- Apply feature engineering (25 features total)
- Perform hyperparameter tuning (RandomizedSearchCV)
- Train optimized Random Forest model
- Export model to `supabase/functions/predict-disease/trained_disease_model.json`

## Model Features

### Base Features (14)
- diarrhea, vomiting, fever, stomach_pain, nausea, weakness, headache
- jaundice, dark_urine, dehydration, rash, body_pain, blood_stool, loss_appetite

### Engineered Features (11)
- symptom_count
- Co-occurrence patterns: fever_diarrhea, diarrhea_vomiting, jaundice_dark_urine, etc.
- Intensity scores: gi_score, systemic_score, severe_symptom_count

## Model Performance

- **Target Accuracy**: 80-90%
- **Hyperparameter Tuning**: Automatic via RandomizedSearchCV
- **Cross-Validation**: 5-fold CV for robust evaluation

## Output

The trained model is exported to:
- `trained_disease_model.json` (local)
- `supabase/functions/predict-disease/trained_disease_model.json` (for Edge Function)

The Edge Function (`supabase/functions/predict-disease/index.ts`) automatically uses the exported model.




