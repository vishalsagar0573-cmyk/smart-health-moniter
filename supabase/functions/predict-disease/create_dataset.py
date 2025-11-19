"""
Medical Knowledge-Based Dataset Creation Script
Creates a realistic symptom-disease dataset based on medical literature patterns
"""

import json
import csv
import numpy as np
import pandas as pd

# Disease definitions with realistic symptom patterns based on medical knowledge
DISEASE_PATTERNS = {
    0: {  # Cholera / Acute Gastroenteritis
        'name': 'Cholera / Acute Gastroenteritis',
        'symptom_probabilities': {
            'diarrhea': 0.95,  # Very common (watery diarrhea)
            'vomiting': 0.85,  # Very common
            'fever': 0.50,  # Moderate
            'stomach_pain': 0.70,  # Common
            'nausea': 0.90,  # Very common
            'weakness': 0.95,  # Very common (severe weakness)
            'headache': 0.40,  # Less common
            'jaundice': 0.05,  # Rare
            'dark_urine': 0.10,  # Uncommon
            'dehydration': 0.95,  # Very common (severe)
            'rash': 0.05,  # Rare
            'body_pain': 0.60,  # Common
            'blood_stool': 0.15,  # Uncommon
            'loss_appetite': 0.90  # Very common
        },
        'risk_level': 'High',
        'advice': '🚨 URGENT: Drink boiled water immediately, use ORS (Oral Rehydration Solution), avoid contaminated food/water, and visit the nearest health center IMMEDIATELY. This is a medical emergency.'
    },
    1: {  # Typhoid Fever
        'name': 'Typhoid Fever',
        'symptom_probabilities': {
            'diarrhea': 0.60,  # Common (constipation can also occur)
            'vomiting': 0.30,  # Less common
            'fever': 0.95,  # Very common (sustained high fever)
            'stomach_pain': 0.85,  # Very common
            'nausea': 0.70,  # Common
            'weakness': 0.90,  # Very common
            'headache': 0.85,  # Very common
            'jaundice': 0.10,  # Uncommon
            'dark_urine': 0.15,  # Uncommon
            'dehydration': 0.50,  # Moderate
            'rash': 0.40,  # Common (rose-colored spots)
            'body_pain': 0.80,  # Common
            'blood_stool': 0.20,  # Uncommon
            'loss_appetite': 0.90  # Very common
        },
        'risk_level': 'Moderate',
        'advice': '⚠️ Take complete rest, avoid street food and untreated water, maintain hygiene, and visit a clinic for proper diagnosis and antibiotics. Monitor temperature regularly.'
    },
    2: {  # Hepatitis A
        'name': 'Hepatitis A',
        'symptom_probabilities': {
            'diarrhea': 0.30,  # Less common
            'vomiting': 0.50,  # Moderate
            'fever': 0.70,  # Common
            'stomach_pain': 0.75,  # Common (right upper quadrant)
            'nausea': 0.80,  # Very common
            'weakness': 0.85,  # Very common
            'headache': 0.60,  # Common
            'jaundice': 0.85,  # Very common (hallmark symptom)
            'dark_urine': 0.90,  # Very common
            'dehydration': 0.40,  # Moderate
            'rash': 0.20,  # Uncommon
            'body_pain': 0.70,  # Common
            'blood_stool': 0.05,  # Rare
            'loss_appetite': 0.85  # Very common
        },
        'risk_level': 'High',
        'advice': '🚨 URGENT: Avoid contaminated food and water, maintain strict hygiene, rest completely, and see a doctor immediately. Hepatitis A is highly contagious - isolate patient and disinfect surfaces.'
    },
    3: {  # Bacterial Dysentery
        'name': 'Bacterial Dysentery',
        'symptom_probabilities': {
            'diarrhea': 0.95,  # Very common (bloody diarrhea)
            'vomiting': 0.40,  # Moderate
            'fever': 0.70,  # Common
            'stomach_pain': 0.90,  # Very common (cramping)
            'nausea': 0.60,  # Common
            'weakness': 0.80,  # Common
            'headache': 0.50,  # Moderate
            'jaundice': 0.05,  # Rare
            'dark_urine': 0.10,  # Uncommon
            'dehydration': 0.75,  # Common
            'rash': 0.10,  # Uncommon
            'body_pain': 0.50,  # Moderate
            'blood_stool': 0.90,  # Very common (hallmark symptom)
            'loss_appetite': 0.80  # Common
        },
        'risk_level': 'High',
        'advice': '🚨 Take ORS immediately, maintain hygiene, avoid solid foods initially, and consult a doctor. Blood in stool requires immediate medical attention.'
    },
    4: {  # Water-related Skin Infection
        'name': 'Water-related Skin Infection',
        'symptom_probabilities': {
            'diarrhea': 0.10,  # Rare
            'vomiting': 0.05,  # Rare
            'fever': 0.30,  # Less common
            'stomach_pain': 0.20,  # Uncommon
            'nausea': 0.15,  # Uncommon
            'weakness': 0.30,  # Less common
            'headache': 0.25,  # Uncommon
            'jaundice': 0.05,  # Rare
            'dark_urine': 0.05,  # Rare
            'dehydration': 0.20,  # Uncommon
            'rash': 0.95,  # Very common (hallmark symptom)
            'body_pain': 0.40,  # Moderate
            'blood_stool': 0.05,  # Rare
            'loss_appetite': 0.30  # Less common
        },
        'risk_level': 'Low',
        'advice': 'ℹ️ Maintain personal hygiene, avoid contact with dirty water, keep affected area clean and dry, and apply antiseptic. Visit health worker if rash spreads or worsens.'
    },
    5: {  # Malaria / General Infection
        'name': 'Malaria / General Infection',
        'symptom_probabilities': {
            'diarrhea': 0.30,  # Less common
            'vomiting': 0.40,  # Moderate
            'fever': 0.95,  # Very common (intermittent/chills)
            'stomach_pain': 0.50,  # Moderate
            'nausea': 0.60,  # Common
            'weakness': 0.85,  # Very common
            'headache': 0.80,  # Common
            'jaundice': 0.20,  # Uncommon
            'dark_urine': 0.25,  # Uncommon
            'dehydration': 0.50,  # Moderate
            'rash': 0.15,  # Uncommon
            'body_pain': 0.85,  # Very common (muscle aches)
            'blood_stool': 0.05,  # Rare
            'loss_appetite': 0.70  # Common
        },
        'risk_level': 'Moderate',
        'advice': '⚠️ Sleep under mosquito nets, take prescribed antimalarial medication, drink plenty of fluids, and seek medical help. Monitor fever patterns (intermittent fever is typical of malaria).'
    },
    6: {  # Acute Diarrheal Disease
        'name': 'Acute Diarrheal Disease',
        'symptom_probabilities': {
            'diarrhea': 0.95,  # Very common
            'vomiting': 0.50,  # Moderate
            'fever': 0.40,  # Moderate
            'stomach_pain': 0.75,  # Common
            'nausea': 0.70,  # Common
            'weakness': 0.70,  # Common
            'headache': 0.40,  # Moderate
            'jaundice': 0.05,  # Rare
            'dark_urine': 0.10,  # Uncommon
            'dehydration': 0.70,  # Common
            'rash': 0.10,  # Uncommon
            'body_pain': 0.50,  # Moderate
            'blood_stool': 0.20,  # Uncommon
            'loss_appetite': 0.75  # Common
        },
        'risk_level': 'Moderate',
        'advice': '⚠️ Drink ORS frequently, eat bland foods (rice, banana), maintain hygiene, boil all drinking water, and visit health center if symptoms persist for more than 2 days.'
    },
    7: {  # Gastroenteritis
        'name': 'Gastroenteritis',
        'symptom_probabilities': {
            'diarrhea': 0.90,  # Very common
            'vomiting': 0.80,  # Common
            'fever': 0.50,  # Moderate
            'stomach_pain': 0.85,  # Very common
            'nausea': 0.85,  # Very common
            'weakness': 0.75,  # Common
            'headache': 0.50,  # Moderate
            'jaundice': 0.05,  # Rare
            'dark_urine': 0.10,  # Uncommon
            'dehydration': 0.65,  # Common
            'rash': 0.10,  # Uncommon
            'body_pain': 0.60,  # Common
            'blood_stool': 0.15,  # Uncommon
            'loss_appetite': 0.80  # Common
        },
        'risk_level': 'Moderate',
        'advice': '⚠️ Stay hydrated with ORS, avoid dairy and spicy foods, rest, and maintain hand hygiene. Visit doctor if symptoms worsen or persist beyond 3 days.'
    }
}

def generate_realistic_dataset(n_samples_per_disease=500, total_samples=None):
    """
    Generate a realistic medical dataset based on disease-symptom patterns
    Enhanced version with more samples and better symptom combinations
    """
    print("=" * 60)
    print("CREATING ENHANCED MEDICAL KNOWLEDGE-BASED DATASET")
    print("=" * 60)
    
    np.random.seed(42)  # For reproducibility
    data = []
    
    # If total_samples specified, distribute evenly
    if total_samples:
        n_samples_per_disease = total_samples // len(DISEASE_PATTERNS)
    
    print(f"\nGenerating {n_samples_per_disease} samples per disease...")
    print(f"Total samples: {n_samples_per_disease * len(DISEASE_PATTERNS)}")
    
    # Generate samples for each disease
    for disease_id, disease_info in DISEASE_PATTERNS.items():
        print(f"\nGenerating samples for {disease_info['name']}...")
        
        for _ in range(n_samples_per_disease):
            sample = {}
            
            # Generate symptoms based on probabilities with enhanced variation
            for symptom, probability in disease_info['symptom_probabilities'].items():
                # Add some randomness but follow the probability pattern
                # Use binomial distribution for realistic variation
                # Add slight variation to probabilities for more diversity
                adjusted_prob = probability + np.random.uniform(-0.05, 0.05)
                adjusted_prob = max(0.0, min(1.0, adjusted_prob))  # Clamp to [0, 1]
                sample[symptom] = int(np.random.binomial(1, adjusted_prob))
            
            # Ensure at least one symptom is present (realistic)
            if sum(sample.values()) == 0:
                # If no symptoms, add the most common symptom for this disease
                most_common = max(disease_info['symptom_probabilities'].items(), 
                                key=lambda x: x[1])[0]
                sample[most_common] = 1
            
            # Add symptom count feature (will be used in feature engineering)
            sample['symptom_count'] = sum([v for k, v in sample.items() if k != 'disease_id'])
            
            # Add disease-specific symptom clusters (co-occurrence patterns)
            # For example, if jaundice is present, dark_urine is more likely
            if disease_id == 2:  # Hepatitis A
                if sample.get('jaundice', 0) == 1 and np.random.random() < 0.85:
                    sample['dark_urine'] = 1
            
            # Cholera: diarrhea + vomiting + dehydration cluster
            if disease_id == 0:  # Cholera
                if sample.get('diarrhea', 0) == 1 and sample.get('vomiting', 0) == 1:
                    if np.random.random() < 0.90:
                        sample['dehydration'] = 1
            
            # Dysentery: diarrhea + blood_stool cluster
            if disease_id == 3:  # Dysentery
                if sample.get('diarrhea', 1) == 1 and np.random.random() < 0.85:
                    sample['blood_stool'] = 1
            
            sample['disease_id'] = disease_id
            data.append(sample)
    
    print(f"\n[OK] Generated {len(data)} samples")
    print(f"   Diseases: {len(DISEASE_PATTERNS)}")
    print(f"   Samples per disease: {n_samples_per_disease}")
    
    return data

def save_dataset_csv(data, filename='dataset.csv'):
    """Save dataset to CSV file"""
    if not data:
        print("No data to save")
        return
    
    # Get feature names (all keys except disease_id)
    feature_names = [key for key in data[0].keys() if key != 'disease_id']
    feature_names.sort()  # Sort for consistency
    feature_names.append('disease_id')  # Add disease_id at the end
    
    print(f"\nSaving dataset to {filename}...")
    with open(filename, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=feature_names)
        writer.writeheader()
        writer.writerows(data)
    
    print(f"[OK] Dataset saved to {filename}")
    print(f"   Total rows: {len(data)}")
    print(f"   Features: {len(feature_names) - 1}")

def save_dataset_json(data, filename='dataset.json'):
    """Save dataset to JSON file"""
    print(f"\nSaving dataset to {filename}...")
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"[OK] Dataset saved to {filename}")

def analyze_dataset(data):
    """Analyze the generated dataset"""
    print("\n" + "=" * 60)
    print("DATASET ANALYSIS")
    print("=" * 60)
    
    df = pd.DataFrame(data)
    
    # Disease distribution
    print("\nDisease Distribution:")
    disease_counts = df['disease_id'].value_counts().sort_index()
    for disease_id, count in disease_counts.items():
        disease_name = DISEASE_PATTERNS[disease_id]['name']
        print(f"  {disease_id}: {disease_name:30s} - {count:4d} samples ({count/len(df)*100:.1f}%)")
    
    # Symptom frequency
    print("\nSymptom Frequency (Overall):")
    symptom_cols = [col for col in df.columns if col != 'disease_id']
    for symptom in sorted(symptom_cols):
        freq = df[symptom].sum() / len(df)
        print(f"  {symptom:20s}: {freq:.2%}")
    
    # Per-disease symptom analysis
    print("\nSymptom Frequency by Disease:")
    for disease_id in sorted(df['disease_id'].unique()):
        disease_name = DISEASE_PATTERNS[disease_id]['name']
        disease_data = df[df['disease_id'] == disease_id]
        print(f"\n  {disease_id}: {disease_name}")
        for symptom in sorted(symptom_cols):
            freq = disease_data[symptom].sum() / len(disease_data)
            expected = DISEASE_PATTERNS[disease_id]['symptom_probabilities'][symptom]
            print(f"    {symptom:20s}: {freq:.2%} (expected: {expected:.2%})")

if __name__ == "__main__":
    # Generate enhanced dataset with 500 samples per disease (4000 total)
    # This provides more training data for better model generalization
    dataset = generate_realistic_dataset(n_samples_per_disease=500)
    
    # Analyze dataset
    analyze_dataset(dataset)
    
    # Save in both formats
    save_dataset_csv(dataset, 'dataset.csv')
    save_dataset_json(dataset, 'dataset.json')
    
    print("\n" + "=" * 60)
    print("DATASET CREATION COMPLETE")
    print("=" * 60)
    print(f"\nFiles created:")
    print(f"  - dataset.csv")
    print(f"  - dataset.json")
    print(f"\nTotal samples: {len(dataset)}")
    print(f"Diseases: {len(DISEASE_PATTERNS)}")

