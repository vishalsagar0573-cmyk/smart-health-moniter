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

// Predict using Random Forest (ensemble of decision trees)
function predictDisease(model: TrainedModel, symptoms: string[]): {
  disease: string;
  riskLevel: string;
  advice: string;
  confidence: number;
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

  // Handle no symptoms
  if (symptoms.length === 0) {
    return {
      disease: "No Disease Detected",
      riskLevel: "Low",
      advice: "✅ No concerning symptoms reported. Continue maintaining good hygiene and water quality practices.",
      confidence: 1.0,
      model_accuracy: model.training_info.test_accuracy,
    };
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
    return fallbackPrediction(symptoms, model);
  }

  return {
    disease: diseaseInfo.name,
    riskLevel: diseaseInfo.risk_level,
    advice: diseaseInfo.advice,
    confidence: Math.round(confidence * 100) / 100,
    model_accuracy: model.training_info.test_accuracy,
  };
}

// Fallback prediction when model trees are not available
function fallbackPrediction(symptoms: string[], model: TrainedModel): {
  disease: string;
  riskLevel: string;
  advice: string;
  confidence: number;
  model_accuracy: number;
} {
  const hasSevereSymptoms = symptoms.some(s =>
    ["blood_stool", "jaundice", "dehydration"].includes(s)
  );
  const hasMultipleSymptoms = symptoms.length >= 3;

  if (hasSevereSymptoms) {
    return {
      disease: "Potential Water-borne Illness (Severe)",
      riskLevel: "High",
      advice: "🚨 URGENT: Your symptoms require immediate medical attention. Visit the nearest health center or hospital without delay. Drink boiled water and maintain strict hygiene.",
      confidence: 0.7,
      model_accuracy: model.training_info.test_accuracy,
    };
  } else if (hasMultipleSymptoms) {
    return {
      disease: "Possible Water-borne Infection",
      riskLevel: "Moderate",
      advice: "⚠️ Multiple symptoms detected. Monitor closely, drink only boiled water, maintain hygiene, and consult a health worker if symptoms persist or worsen.",
      confidence: 0.65,
      model_accuracy: model.training_info.test_accuracy,
    };
  } else {
    return {
      disease: "Minor Health Concern",
      riskLevel: "Low",
      advice: "ℹ️ Monitor symptoms, maintain good hygiene practices, drink boiled water, and consult a health worker if condition worsens.",
      confidence: 0.6,
      model_accuracy: model.training_info.test_accuracy,
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symptoms } = await req.json();

    console.log("=== ML DISEASE PREDICTION MODEL ===");
    console.log("Model:", trainedModel.model_type);
    console.log("Trees:", trainedModel.n_estimators);
    console.log("Training Accuracy:", (trainedModel.training_info.training_accuracy * 100).toFixed(1) + "%");
    console.log("Test Accuracy:", (trainedModel.training_info.test_accuracy * 100).toFixed(1) + "%");
    console.log("Input symptoms:", symptoms);

    if (!Array.isArray(symptoms)) {
      throw new Error("Symptoms must be an array");
    }

    const prediction = predictDisease(trainedModel as TrainedModel, symptoms);

    console.log("\n=== PREDICTION RESULTS ===");
    console.log("Disease:", prediction.disease);
    console.log("Risk Level:", prediction.riskLevel);
    console.log("Confidence:", (prediction.confidence * 100).toFixed(1) + "%");
    console.log("Model Accuracy:", (prediction.model_accuracy * 100).toFixed(1) + "%");

    return new Response(
      JSON.stringify({
        success: true,
        prediction: {
          disease: prediction.disease,
          risk_level: prediction.riskLevel,
          advice: prediction.advice,
          confidence: prediction.confidence,
        },
        model_info: {
          algorithm: trainedModel.model_type,
          n_estimators: trainedModel.n_estimators,
          training_accuracy: trainedModel.training_info.training_accuracy,
          test_accuracy: trainedModel.training_info.test_accuracy,
          symptoms_processed: symptoms.length,
          feature_importances: trainedModel.feature_importances,
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