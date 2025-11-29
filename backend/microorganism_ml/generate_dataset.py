import pandas as pd
import numpy as np
import random

# Microorganism Rules
# Vibrio cholerae: pH < 7, turbidity > 5, diarrhea, vomiting
# Salmonella typhi: fever, headache, weakness, turbidity > 2
# Hepatitis A virus: jaundice, dark_urine, nausea
# Shigella spp.: blood_stool, stomach_pain
# E. coli: diarrhea, stomach_pain, turbidity > 5
# Giardia lamblia: nausea, stomach_pain, turbidity > 3
# Leptospira: body_pain, fever
# Pseudomonas: rash
# Cryptosporidium: diarrhea, turbidity > 5

def generate_synthetic_data(num_samples=5000):
    data = []
    
    symptoms_list = [
        "diarrhea", "vomiting", "fever", "stomach_pain", "nausea", "weakness",
        "headache", "jaundice", "dark_urine", "dehydration", "rash", 
        "body_pain", "blood_stool", "loss_appetite"
    ]
    
    for _ in range(num_samples):
        # Randomize Symptoms (0 or 1)
        sample = {s: random.choice([0, 1]) for s in symptoms_list}
        
        # Randomize Water Quality
        # pH mostly between 5 and 9
        sample['pH'] = round(random.uniform(5.0, 9.0), 1)
        # Turbidity mostly between 0 and 15
        sample['turbidity'] = round(random.uniform(0.0, 15.0), 1)
        
        microorganisms = []
        
        # Apply Rules with some probability
        
        # Vibrio cholerae
        if sample['pH'] < 7.0 and sample['turbidity'] > 5.0 and (sample['diarrhea'] or sample['vomiting']):
            if random.random() > 0.1: microorganisms.append("Vibrio cholerae")
            
        # Salmonella typhi
        if (sample['fever'] or sample['headache'] or sample['weakness']) and sample['turbidity'] > 2.0:
             if random.random() > 0.2: microorganisms.append("Salmonella typhi")
             
        # Hepatitis A virus
        if sample['jaundice'] or sample['dark_urine'] or sample['nausea']:
             if random.random() > 0.2: microorganisms.append("Hepatitis A virus")
             
        # Shigella spp.
        if sample['blood_stool'] or sample['stomach_pain']:
             if random.random() > 0.2: microorganisms.append("Shigella spp.")
             
        # E. coli
        if (sample['diarrhea'] or sample['stomach_pain']) and sample['turbidity'] > 4.0:
             if random.random() > 0.15: microorganisms.append("E. coli")
             
        # Giardia lamblia
        if (sample['nausea'] or sample['stomach_pain']) and sample['turbidity'] > 3.0:
             if random.random() > 0.2: microorganisms.append("Giardia lamblia")
             
        # Leptospira
        if sample['body_pain'] and sample['fever']:
             if random.random() > 0.2: microorganisms.append("Leptospira")
             
        # Pseudomonas
        if sample['rash']:
             if random.random() > 0.1: microorganisms.append("Pseudomonas")
             
        # Cryptosporidium
        if sample['diarrhea'] and sample['turbidity'] > 5.0:
             if random.random() > 0.2: microorganisms.append("Cryptosporidium")
             
        # No organism case (Clean water or unrelated symptoms)
        if not microorganisms and sample['turbidity'] < 2.0 and 6.5 <= sample['pH'] <= 7.5:
            microorganisms.append("None")
            
        sample['possible_microorganisms'] = ",".join(microorganisms) if microorganisms else "None"
        data.append(sample)
        
    df = pd.DataFrame(data)
    return df

if __name__ == "__main__":
    df = generate_synthetic_data()
    df.to_csv("microorganisms_dataset.csv", index=False)
    print("Dataset generated: microorganisms_dataset.csv")
