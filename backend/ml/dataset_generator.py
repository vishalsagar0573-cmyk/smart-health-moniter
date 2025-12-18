import csv
import random
import os

# Output path (ensure absolute or relative to execution)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BASE_DIR, "water_disease_dataset.csv")

NUM_SAMPLES = 2000

def generate_sample():
    ph = round(random.uniform(4.0, 10.0), 2)
    turbidity = round(random.uniform(0.1, 15.0), 2)
    if random.random() < 0.2: turbidity = round(random.uniform(15.0, 100.0), 2)

    diarrhea = 0
    vomiting = 0
    fever = 0
    skin_rash = 0
    jaundice = 0
    stomach_pain = 0

    label = "None"
    r = random.random()
    
    if ph < 5.5:
        if r < 0.9:
            label = "Fungi"
            skin_rash = 1 if random.random() < 0.4 else 0
    elif ph > 9.0:
        if r < 0.8: label = "Sulfate-Reducing Bacteria"
    elif turbidity > 5.0 and (5.5 <= ph <= 8.5):
        if r < 0.6: 
            label = "E. coli"
            diarrhea = 1
            stomach_pain = 1
            if random.random() < 0.3: vomiting = 1
        elif r < 0.8:
            label = "Protozoa"
            diarrhea = 1
        elif r < 0.9:
            label = "Viruses"
            vomiting = 1
            diarrhea = 1
    
    if turbidity > 3.0 and r < 0.15:
        label = "Vibrio cholerae"
        diarrhea = 1
        vomiting = 1
        stomach_pain = 1
    
    if r > 0.85 and r < 0.95:
        label = "Salmonella"
        fever = 1
        diarrhea = 1
        stomach_pain = 1
    
    if r > 0.95:
        label = "Hepatitis A/E"
        jaundice = 1
        if random.random() < 0.5: fever = 1
        
    if (7.5 <= ph <= 8.5) and random.random() < 0.1:
        label = "Cyanobacteria"
        skin_rash = 1

    if label == "None":
        if random.random() < 0.1: fever = 1
        if random.random() < 0.05: stomach_pain = 1
    
    if label != "None" and random.random() < 0.05:
        diarrhea = 0; vomiting = 0; fever = 0

    return [ph, turbidity, diarrhea, vomiting, fever, skin_rash, jaundice, stomach_pain, label]

data = []
header = ["pH", "Turbidity", "Diarrhea", "Vomiting", "Fever", "Skin_Rash", "Jaundice", "Stomach_Pain", "Label"]

for _ in range(NUM_SAMPLES):
    data.append(generate_sample())

try:
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(data)
    print(f"Successfully generated {NUM_SAMPLES} samples to {OUTPUT_FILE}")
except Exception as e:
    print(f"Error generating dataset: {e}")
