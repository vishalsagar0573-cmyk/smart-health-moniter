import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import trainedModel from "./trained_disease_model.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Type definitions for ML model
interface TreeNode {
  type: 'split' | 'leaf';
  feature?: string;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  class?: number;
  probabilities?: number[];
}

interface TrainedModel {
  model_type: string;
  n_estimators: number;
  feature_names: string[];
  classes: number[];
  disease_metadata: DiseaseMetadata[];
  trees: TreeNode[];
  feature_importances: Record<string, number>;
  training_info: {
    training_samples: number;
    test_samples: number;
    training_accuracy: number;
    test_accuracy: number;
  };
}

interface DiseaseMetadata {
  id: number;
  name: string;
  risk_level: string;
  advice: string;
}

interface SymptomFeatures {
  diarrhea: number;
  vomiting: number;
  fever: number;
  stomach_pain: number;
  nausea: number;
  weakness: number;
  headache: number;
  jaundice: number;
  dark_urine: number;
  dehydration: number;
  rash: number;
  body_pain: number;
  blood_stool: number;
  loss_appetite: number;
}

// Extended feature interface to include engineered features
interface ExtendedFeatures extends SymptomFeatures {
  [key: string]: number; // Allow dynamic feature names
}

// Disease symptom patterns for similarity scoring
const DISEASE_PATTERNS: Record<number, {
  name: string;
  common_symptoms: string[];
  critical_symptoms: string[];
  weight: number;
}> = {
  0: { // Cholera
    name: "Cholera / Acute Gastroenteritis",
    common_symptoms: ["diarrhea", "vomiting", "dehydration", "nausea", "weakness"],
    critical_symptoms: ["diarrhea", "dehydration"],
    weight: 1.0
  },
  1: { // Typhoid
    name: "Typhoid Fever",
    common_symptoms: ["fever", "headache", "weakness", "nausea", "loss_appetite", "body_pain"],
    critical_symptoms: ["fever", "headache"],
    weight: 1.0
  },
  2: { // Hepatitis A
    name: "Hepatitis A",
    common_symptoms: ["jaundice", "dark_urine", "nausea", "loss_appetite", "weakness"],
    critical_symptoms: ["jaundice", "dark_urine"],
    weight: 1.0
  },
  3: { // Dysentery
    name: "Bacterial Dysentery",
    common_symptoms: ["diarrhea", "blood_stool", "stomach_pain", "fever", "dehydration"],
    critical_symptoms: ["blood_stool", "diarrhea"],
    weight: 1.0
  },
  4: { // Skin Infection
    name: "Water-related Skin Infection",
    common_symptoms: ["rash", "fever", "body_pain"],
    critical_symptoms: ["rash"],
    weight: 0.8
  },
  5: { // Malaria
    name: "Malaria / General Infection",
    common_symptoms: ["fever", "body_pain", "headache", "weakness", "nausea"],
    critical_symptoms: ["fever", "body_pain"],
    weight: 1.0
  },
  6: { // Acute Diarrhea
    name: "Acute Diarrheal Disease",
    common_symptoms: ["diarrhea", "stomach_pain", "nausea", "weakness", "dehydration"],
    critical_symptoms: ["diarrhea"],
    weight: 0.9
  },
  7: { // Gastroenteritis
    name: "Gastroenteritis",
    common_symptoms: ["diarrhea", "vomiting", "nausea", "stomach_pain", "weakness"],
    critical_symptoms: ["diarrhea", "vomiting"],
    weight: 0.9
  }
};

// Fallback patterns for sparse symptoms
const SPARSE_SYMPTOM_PATTERNS: Record<string, {
  disease: string;
  diseaseId: number;
  confidence: number;
  advice: string;
}> = {
  "headache": {
    disease: "Typhoid Fever (Early Stage)",
    diseaseId: 1,
    confidence: 0.55,
    advice: "Monitor for fever and other symptoms. Drink clean water and maintain hygiene."
  },
  "loss_appetite": {
    disease: "Typhoid Fever (Early Stage)",
    diseaseId: 1,
    confidence: 0.52,
    advice: "Loss of appetite can indicate early infection. Monitor closely and ensure proper nutrition."
  },
  "weakness": {
    disease: "General Viral Infection",
    diseaseId: 5,
    confidence: 0.50,
    advice: "Rest adequately, stay hydrated, and monitor for additional symptoms."
  },
  "nausea": {
    disease: "Gastroenteritis (Mild)",
    diseaseId: 7,
    confidence: 0.53,
    advice: "Avoid heavy meals, drink clean water, and monitor for vomiting or diarrhea."
  },
  "stomach_pain": {
    disease: "Gastritis / Gastroenteritis",
    diseaseId: 7,
    confidence: 0.54,
    advice: "Avoid spicy foods, drink clean water, and consult a health worker if pain persists."
  },
  "body_pain": {
    disease: "Viral Fever / Malaria",
    diseaseId: 5,
    confidence: 0.52,
    advice: "Rest, stay hydrated, and monitor for fever. Seek medical care if symptoms worsen."
  },
  "rash": {
    disease: "Water-related Skin Infection",
    diseaseId: 4,
    confidence: 0.70,
    advice: "Keep affected area clean and dry. Avoid scratching and consult a health worker."
  },
  "dehydration": {
    disease: "Mild Diarrheal Issue",
    diseaseId: 6,
    confidence: 0.60,
    advice: "Drink ORS immediately, avoid contaminated water, and monitor for diarrhea."
  }
};

// Calculate similarity score between symptoms and disease pattern
function calculateSimilarity(symptoms: string[], diseasePattern: typeof DISEASE_PATTERNS[0]): number {
  let score = 0;
  let criticalMatches = 0;
  let commonMatches = 0;
  
  // Check critical symptoms (higher weight)
  for (const symptom of symptoms) {
    if (diseasePattern.critical_symptoms.includes(symptom)) {
      criticalMatches++;
      score += 2.0; // Critical symptoms worth more
    } else if (diseasePattern.common_symptoms.includes(symptom)) {
      commonMatches++;
      score += 1.0;
    }
  }
  
  // Normalize by total possible symptoms
  const totalSymptoms = diseasePattern.common_symptoms.length;
  const normalizedScore = score / (totalSymptoms * 1.5);
  
  // Apply disease weight
  return normalizedScore * diseasePattern.weight;
}

// Predict disease using similarity scoring (for sparse symptoms)
function predictWithSimilarity(
  model: TrainedModel,
  symptoms: string[],
  peopleAffected: number,
  waterQuality?: any
): {
  predicted_disease: string;
  confidence: number;
  risk_level: string;
  urgency: string;
  advice: string;
  key_symptoms_detected: string[];
  model_accuracy: number;
  matched_symptoms: string[];
} {
  // Single symptom fallback
  if (symptoms.length === 1) {
    const singleSymptom = symptoms[0];
    const fallback = SPARSE_SYMPTOM_PATTERNS[singleSymptom];
    
    if (fallback) {
      const riskLevel = determineRiskLevel(symptoms, peopleAffected, waterQuality, "Safe");
      const urgency = determineUrgency(symptoms, riskLevel);
      
      return {
        predicted_disease: fallback.disease,
        confidence: fallback.confidence,
        risk_level: riskLevel,
        urgency: urgency,
        advice: fallback.advice,
        key_symptoms_detected: symptoms,
        model_accuracy: model.training_info.test_accuracy,
        matched_symptoms: symptoms
      };
    }
  }
  
  // Calculate similarity scores for all diseases
  const scores: Array<{diseaseId: number; score: number; pattern: typeof DISEASE_PATTERNS[0]}> = [];
  
  for (const [diseaseIdStr, pattern] of Object.entries(DISEASE_PATTERNS)) {
    const diseaseId = parseInt(diseaseIdStr);
    const score = calculateSimilarity(symptoms, pattern);
    scores.push({ diseaseId, score, pattern });
  }
  
  // Sort by score (highest first)
  scores.sort((a, b) => b.score - a.score);
  
  // Get best match
  const bestMatch = scores[0];
  
  // If no good match, use intelligent fallback
  if (bestMatch.score < 0.1) {
    return intelligentFallback(symptoms, peopleAffected, waterQuality, model);
  }
  
  // Calculate confidence based on score
  const confidence = Math.min(0.45 + (bestMatch.score * 0.3), 0.75);
  
  // Get disease info
  const diseaseInfo = model.disease_metadata.find(d => d.id === bestMatch.diseaseId);
  const diseaseName = diseaseInfo ? diseaseInfo.name : bestMatch.pattern.name;
  
  // Determine risk and urgency
  const riskLevel = determineRiskLevel(symptoms, peopleAffected, waterQuality, "Safe");
  const urgency = determineUrgency(symptoms, riskLevel);
  
  // Generate advice
  const advice = generateAdvice(diseaseName, riskLevel, urgency, symptoms, peopleAffected);
  
  return {
    predicted_disease: diseaseName + " (Early Stage)",
    confidence: confidence,
    risk_level: riskLevel,
    urgency: urgency,
    advice: advice,
    key_symptoms_detected: symptoms,
    model_accuracy: model.training_info.test_accuracy,
    matched_symptoms: symptoms.filter(s => bestMatch.pattern.common_symptoms.includes(s))
  };
}

// Intelligent fallback for unclear symptoms
function intelligentFallback(
  symptoms: string[],
  peopleAffected: number,
  waterQuality: any,
  model: TrainedModel
): {
  predicted_disease: string;
  confidence: number;
  risk_level: string;
  urgency: string;
  advice: string;
  key_symptoms_detected: string[];
  model_accuracy: number;
  matched_symptoms: string[];
} {
  // Combination patterns
  const symptomSet = new Set(symptoms);
  
  let predictedDisease = "General Mild Infection";
  let confidence = 0.50;
  let baseAdvice = "Monitor symptoms closely, drink clean water, maintain hygiene.";
  
  // Check common combinations
  if (symptomSet.has("headache") && symptomSet.has("loss_appetite")) {
    predictedDisease = "Typhoid Fever (Early Stage)";
    confidence = 0.58;
    baseAdvice = "Early signs of typhoid. Monitor for fever, drink clean water, and consult a health worker if symptoms worsen.";
  } else if (symptomSet.has("weakness") && symptomSet.has("nausea")) {
    predictedDisease = "Gastroenteritis (Mild)";
    confidence = 0.56;
    baseAdvice = "Mild gastrointestinal symptoms. Stay hydrated, avoid heavy meals, and monitor for diarrhea or vomiting.";
  } else if (symptomSet.has("fever") && symptomSet.has("body_pain")) {
    predictedDisease = "Viral Fever / Malaria";
    confidence = 0.60;
    baseAdvice = "Possible viral infection or malaria. Rest, stay hydrated, and seek medical testing if fever persists.";
  } else if (symptomSet.has("headache") && symptomSet.has("weakness")) {
    predictedDisease = "Viral Infection / Mild Illness";
    confidence = 0.52;
    baseAdvice = "General viral symptoms. Rest adequately, stay hydrated, and monitor for additional symptoms.";
  }
  
  const riskLevel = determineRiskLevel(symptoms, peopleAffected, waterQuality, "Safe");
  const urgency = determineUrgency(symptoms, riskLevel);
  
  return {
    predicted_disease: predictedDisease,
    confidence: confidence,
    risk_level: riskLevel,
    urgency: urgency,
    advice: "ℹ️ " + baseAdvice + " Consult a health worker if condition worsens.",
    key_symptoms_detected: symptoms,
    model_accuracy: model.training_info.test_accuracy,
    matched_symptoms: symptoms
  };
}

// Execute a single decision tree
function executeTree(node: TreeNode, features: ExtendedFeatures): number {
  if (node.type === 'leaf') {
    return node.class!;
  }

  const featureValue = features[node.feature!] ?? 0; // Default to 0 if feature not found
  if (featureValue <= node.threshold!) {
    return executeTree(node.left!, features);
  } else {
    return executeTree(node.right!, features);
  }
}

// Enhanced prediction with urgency level and key symptoms
function predictDisease(model: TrainedModel, symptoms: string[], peopleAffected: number = 1, waterQuality?: {
  ph?: number;
  turbidity?: number;
  avg_R?: number;
  avg_G?: number;
  avg_B?: number;
  brightness?: number;
}): {
  predicted_disease: string;
  confidence: number;
  risk_level: string;
  urgency: string;
  advice: string;
  key_symptoms_detected: string[];
  model_accuracy: number;
} {
  // Convert symptoms array to base feature vector
  const baseFeatures: SymptomFeatures = {
    diarrhea: symptoms.includes('diarrhea') ? 1 : 0,
    vomiting: symptoms.includes('vomiting') ? 1 : 0,
    fever: symptoms.includes('fever') ? 1 : 0,
    stomach_pain: symptoms.includes('stomach_pain') ? 1 : 0,
    nausea: symptoms.includes('nausea') ? 1 : 0,
    weakness: symptoms.includes('weakness') ? 1 : 0,
    headache: symptoms.includes('headache') ? 1 : 0,
    jaundice: symptoms.includes('jaundice') ? 1 : 0,
    dark_urine: symptoms.includes('dark_urine') ? 1 : 0,
    dehydration: symptoms.includes('dehydration') ? 1 : 0,
    rash: symptoms.includes('rash') ? 1 : 0,
    body_pain: symptoms.includes('body_pain') ? 1 : 0,
    blood_stool: symptoms.includes('blood_stool') ? 1 : 0,
    loss_appetite: symptoms.includes('loss_appetite') ? 1 : 0,
  };
  
  // Calculate symptom count
  const symptomCount = Object.values(baseFeatures).reduce((sum, val) => sum + val, 0);
  
  // Build extended features with engineered features
  const features: ExtendedFeatures = {
    ...baseFeatures,
    // Engineered features (matching preprocessing)
    symptom_count: symptomCount,
    fever_diarrhea: baseFeatures.fever * baseFeatures.diarrhea,
    diarrhea_vomiting: baseFeatures.diarrhea * baseFeatures.vomiting,
    jaundice_dark_urine: baseFeatures.jaundice * baseFeatures.dark_urine,
    diarrhea_blood_stool: baseFeatures.diarrhea * baseFeatures.blood_stool,
    fever_headache: baseFeatures.fever * baseFeatures.headache,
    dehydration_diarrhea: baseFeatures.dehydration * baseFeatures.diarrhea,
    stomach_pain_nausea: baseFeatures.stomach_pain * baseFeatures.nausea,
    fever_body_pain: baseFeatures.fever * baseFeatures.body_pain,
    // Symptom intensity scores
    gi_score: baseFeatures.diarrhea + baseFeatures.vomiting + baseFeatures.nausea + baseFeatures.stomach_pain,
    systemic_score: baseFeatures.fever + baseFeatures.weakness + baseFeatures.headache + baseFeatures.body_pain,
    severe_symptom_count: baseFeatures.blood_stool + baseFeatures.jaundice + baseFeatures.dehydration,
  };

  // Handle no symptoms - still predict mild condition
  if (symptoms.length === 0) {
    return {
      predicted_disease: "General Health Check",
      confidence: 0.5,
      risk_level: "Safe",
      urgency: "Normal",
      advice: "✅ No concerning symptoms reported. Continue maintaining good hygiene and water quality practices. Regular health monitoring is recommended.",
      key_symptoms_detected: [],
      model_accuracy: model.training_info.test_accuracy,
      matched_symptoms: []
    };
  }
  
  // For sparse symptoms (1-2 symptoms), use similarity scoring
  if (symptoms.length <= 2) {
    return predictWithSimilarity(model, symptoms, peopleAffected, waterQuality);
  }

  // If model has no trees, use fallback logic
  if (!model.trees || model.trees.length === 0) {
    console.warn("⚠️ Model has no trees, using fallback prediction");
    return fallbackPrediction(symptoms, model);
  }

  // Run prediction through all trees
  const predictions: number[] = [];
  for (const tree of model.trees) {
    const prediction = executeTree(tree, features);
    predictions.push(prediction);
  }

  // Majority voting
  const voteCounts = new Map<number, number>();
  for (const pred of predictions) {
    voteCounts.set(pred, (voteCounts.get(pred) || 0) + 1);
  }

  let maxVotes = 0;
  let predictedClass = 0;
  for (const [classId, votes] of voteCounts.entries()) {
    if (votes > maxVotes) {
      maxVotes = votes;
      predictedClass = classId;
    }
  }

  // Calculate confidence (percentage of trees that voted for the winning class)
  const confidence = maxVotes / model.n_estimators;

  // Get disease metadata
  const diseaseInfo = model.disease_metadata.find(d => d.id === predictedClass);
  
  if (!diseaseInfo) {
    return fallbackPrediction(symptoms, model, peopleAffected, waterQuality);
  }

  // Determine risk level based on symptoms, people affected, and water quality
  const riskLevel = determineRiskLevel(symptoms, peopleAffected, waterQuality, diseaseInfo.risk_level);
  
  // Determine urgency level
  const urgency = determineUrgency(symptoms, riskLevel);
  
  // Get key symptoms detected
  const keySymptoms = getKeySymptoms(symptoms);
  
  // Generate enhanced advice
  const advice = generateAdvice(diseaseInfo.name, riskLevel, urgency, keySymptoms, peopleAffected);

  return {
    predicted_disease: diseaseInfo.name,
    confidence: Math.round(confidence * 100) / 100,
    risk_level: riskLevel,
    urgency: urgency,
    advice: advice,
    key_symptoms_detected: keySymptoms,
    model_accuracy: model.training_info.test_accuracy,
    matched_symptoms: keySymptoms
  };
}

// Determine risk level based on multiple factors
function determineRiskLevel(
  symptoms: string[],
  peopleAffected: number,
  waterQuality: any,
  baseRiskLevel: string
): string {
  // Critical symptoms
  const criticalSymptoms = ['blood_stool', 'jaundice', 'dehydration'];
  const hasCriticalSymptom = symptoms.some(s => criticalSymptoms.includes(s));
  
  // Severe symptoms
  const severeSymptoms = ['fever', 'vomiting', 'diarrhea', 'dark_urine'];
  const severeCount = symptoms.filter(s => severeSymptoms.includes(s)).length;
  
  // Many people affected
  const manyPeopleAffected = peopleAffected > 3;
  
  // Poor water quality
  const poorWaterQuality = waterQuality && (
    waterQuality.ph < 6.5 || waterQuality.ph > 8.5 ||
    waterQuality.turbidity > 5
  );
  
  // Determine final risk level
  if (hasCriticalSymptom || (severeCount >= 3 && manyPeopleAffected)) {
    return "Critical";
  } else if (severeCount >= 3 || manyPeopleAffected || poorWaterQuality) {
    return "High";
  } else if (symptoms.length >= 2 || peopleAffected > 1) {
    return "Moderate";
  } else {
    return "Safe";
  }
}

// Determine urgency level
function determineUrgency(symptoms: string[], riskLevel: string): string {
  const emergencySymptoms = ['blood_stool', 'jaundice', 'dehydration'];
  const hasEmergencySymptom = symptoms.some(s => emergencySymptoms.includes(s));
  
  if (hasEmergencySymptom || riskLevel === "Critical") {
    return "Emergency";
  } else if (riskLevel === "High") {
    return "Urgent";
  } else if (riskLevel === "Moderate") {
    return "Warning";
  } else {
    return "Normal";
  }
}

// Get key symptoms detected
function getKeySymptoms(symptoms: string[]): string[] {
  // Priority symptoms to highlight
  const prioritySymptoms = [
    'blood_stool',
    'jaundice',
    'dehydration',
    'diarrhea',
    'vomiting',
    'fever',
    'dark_urine',
    'stomach_pain',
    'nausea',
    'weakness'
  ];
  
  return symptoms
    .filter(s => prioritySymptoms.includes(s))
    .slice(0, 5); // Return top 5 key symptoms
}

// Generate comprehensive advice
function generateAdvice(
  disease: string,
  riskLevel: string,
  urgency: string,
  keySymptoms: string[],
  peopleAffected: number
): string {
  let advice = "";
  
  // Urgency-based prefix
  if (urgency === "Emergency") {
    advice += "🚨 EMERGENCY: ";
  } else if (urgency === "Urgent") {
    advice += "⚠️ URGENT: ";
  } else if (urgency === "Warning") {
    advice += "⚠️ WARNING: ";
  } else {
    advice += "ℹ️ ";
  }
  
  // Disease-specific advice
  if (disease.includes("Cholera") || disease.includes("Gastroenteritis")) {
    advice += "Drink boiled water immediately, give ORS (Oral Rehydration Solution), avoid contaminated water";
    if (urgency === "Emergency" || urgency === "Urgent") {
      advice += ", and visit the nearest health center URGENTLY";
    }
    advice += ". Maintain strict hand hygiene and food safety.";
  } else if (disease.includes("Typhoid")) {
    advice += "Seek medical attention immediately for antibiotic treatment. Drink only boiled water, maintain strict hygiene, rest adequately, and avoid preparing food for others.";
  } else if (disease.includes("Hepatitis")) {
    advice += "Seek immediate medical evaluation. Rest completely, avoid alcohol, eat nutritious food, drink boiled water, and maintain excellent hygiene to prevent spread.";
  } else if (disease.includes("Dysentery")) {
    advice += "Seek medical care for proper treatment. Drink boiled water, take ORS, avoid solid foods initially, maintain hygiene, and isolate to prevent spread.";
  } else if (disease.includes("Skin Infection")) {
    advice += "Keep affected area clean and dry, avoid scratching, use clean water for bathing, apply prescribed medication, and consult a health worker if it worsens.";
  } else if (disease.includes("Malaria")) {
    advice += "Seek immediate medical testing and treatment. Rest, stay hydrated, use mosquito nets, eliminate standing water, and take prescribed antimalarial medication.";
  } else if (disease.includes("Diarrheal")) {
    advice += "Drink plenty of boiled water and ORS, avoid contaminated food/water, maintain hygiene, rest, and monitor for worsening symptoms.";
  } else {
    advice += "Monitor symptoms closely, drink only boiled water, maintain good hygiene, rest adequately, and consult a health worker if symptoms persist or worsen.";
  }
  
  // Add community warning if many people affected
  if (peopleAffected > 3) {
    advice += ` ⚠️ COMMUNITY ALERT: ${peopleAffected} people affected - possible outbreak. Inform health authorities immediately and ensure community uses safe water sources.`;
  }
  
  return advice;
}

// Fallback prediction when model trees are not available
function fallbackPrediction(
  symptoms: string[],
  model: TrainedModel,
  peopleAffected: number = 1,
  waterQuality?: any
): {
  predicted_disease: string;
  confidence: number;
  risk_level: string;
  urgency: string;
  advice: string;
  key_symptoms_detected: string[];
  model_accuracy: number;
} {
  const hasSevereSymptoms = symptoms.some(s =>
    ["blood_stool", "jaundice", "dehydration"].includes(s)
  );
  const hasMultipleSymptoms = symptoms.length >= 3;
  
  const keySymptoms = getKeySymptoms(symptoms);
  const riskLevel = determineRiskLevel(symptoms, peopleAffected, waterQuality, hasSevereSymptoms ? "High" : "Moderate");
  const urgency = determineUrgency(symptoms, riskLevel);

  if (hasSevereSymptoms) {
    return {
      predicted_disease: "Potential Water-borne Illness (Severe)",
      confidence: 0.7,
      risk_level: riskLevel,
      urgency: urgency,
      advice: generateAdvice("Water-borne Illness", riskLevel, urgency, keySymptoms, peopleAffected),
      key_symptoms_detected: keySymptoms,
      model_accuracy: model.training_info.test_accuracy,
      matched_symptoms: keySymptoms
    };
  } else if (hasMultipleSymptoms) {
    return {
      predicted_disease: "Possible Water-borne Infection",
      confidence: 0.65,
      risk_level: riskLevel,
      urgency: urgency,
      advice: generateAdvice("Water-borne Infection", riskLevel, urgency, keySymptoms, peopleAffected),
      key_symptoms_detected: keySymptoms,
      model_accuracy: model.training_info.test_accuracy,
      matched_symptoms: keySymptoms
    };
  } else {
    return {
      predicted_disease: "Minor Health Concern",
      confidence: 0.6,
      risk_level: "Safe",
      urgency: "Normal",
      advice: "ℹ️ Monitor symptoms, maintain good hygiene practices, drink boiled water, and consult a health worker if condition worsens.",
      key_symptoms_detected: keySymptoms,
      model_accuracy: model.training_info.test_accuracy,
      matched_symptoms: keySymptoms
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symptoms, peopleAffected, waterQuality } = await req.json();

    console.log("=== ML DISEASE PREDICTION MODEL ===");
    console.log("Model:", trainedModel.model_type);
    console.log("Trees:", trainedModel.n_estimators);
    console.log("Training Accuracy:", (trainedModel.training_info.training_accuracy * 100).toFixed(1) + "%");
    console.log("Test Accuracy:", (trainedModel.training_info.test_accuracy * 100).toFixed(1) + "%");
    console.log("Input symptoms:", symptoms);
    console.log("People affected:", peopleAffected || 1);
    console.log("Water quality:", waterQuality ? "Provided" : "Not provided");

    if (!Array.isArray(symptoms)) {
      throw new Error("Symptoms must be an array");
    }

    const prediction = predictDisease(
      trainedModel as TrainedModel,
      symptoms,
      peopleAffected || 1,
      waterQuality
    );

    console.log("\n=== PREDICTION RESULTS ===");
    console.log("Disease:", prediction.predicted_disease);
    console.log("Risk Level:", prediction.risk_level);
    console.log("Urgency:", prediction.urgency);
    console.log("Confidence:", (prediction.confidence * 100).toFixed(1) + "%");
    console.log("Key Symptoms:", prediction.key_symptoms_detected.join(", "));

    return new Response(
      JSON.stringify({
        success: true,
        predicted_disease: prediction.predicted_disease,
        confidence: prediction.confidence,
        risk_level: prediction.risk_level,
        urgency: prediction.urgency,
        advice: prediction.advice,
        key_symptoms_detected: prediction.key_symptoms_detected,
        matched_symptoms: prediction.matched_symptoms || prediction.key_symptoms_detected,
        model_info: {
          algorithm: trainedModel.model_type,
          n_estimators: trainedModel.n_estimators,
          training_accuracy: trainedModel.training_info.training_accuracy,
          test_accuracy: trainedModel.training_info.test_accuracy,
          model_accuracy: prediction.model_accuracy,
          symptoms_processed: symptoms.length,
          people_affected: peopleAffected || 1,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in predict-disease function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});