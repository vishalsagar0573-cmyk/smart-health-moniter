import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import trainedModel from "./trained_model.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Type definitions for the trained model structure
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
  class_names: string[];
  trees: TreeNode[];
  feature_importances: Record<string, number>;
  training_info: {
    training_samples: number;
    test_samples: number;
    training_accuracy: number;
    test_accuracy: number;
  };
}

interface Features {
  fever: number;
  diarrhea: number;
  vomiting: number;
  pH: number;
  turbidity: number;
  disease_encoded: number;
}

// Disease name to encoded value mapping
const DISEASE_ENCODING: Record<string, number> = {
  'None': 0,
  'Mild_Infection': 1,
  'Food_Poisoning': 2,
  'Viral_Gastroenteritis': 3,
  'Dysentery': 4,
  'Typhoid': 5,
  'Cholera': 6,
  'Hepatitis_A': 7,
  'Severe_Diarrheal_Disease': 8,
  'Unable to Predict': 1  // Default to mild
};

// Execute a single decision tree on input features
function executeTree(node: TreeNode, features: Features): { class: number; probabilities: number[] } {
  if (node.type === 'leaf') {
    return {
      class: node.class!,
      probabilities: node.probabilities!
    };
  }
  
  // Split node - navigate left or right based on threshold
  const featureValue = features[node.feature as keyof Features];
  
  if (featureValue <= node.threshold!) {
    return executeTree(node.left!, features);
  } else {
    return executeTree(node.right!, features);
  }
}

// Random Forest prediction using majority voting
function predictRandomForest(model: TrainedModel, features: Features) {
  const predictions: number[] = [];
  const allProbabilities: number[][] = [];
  
  // Get prediction from each tree
  for (const tree of model.trees) {
    const result = executeTree(tree, features);
    predictions.push(result.class);
    allProbabilities.push(result.probabilities);
  }
  
  // Count votes for each class
  const voteCounts = [0, 0, 0]; // Safe, Moderate, High
  predictions.forEach(pred => voteCounts[pred]++);
  
  // Average probabilities across all trees
  const avgProbabilities = [0, 0, 0];
  allProbabilities.forEach(probs => {
    probs.forEach((p, i) => avgProbabilities[i] += p);
  });
  avgProbabilities.forEach((_, i) => avgProbabilities[i] /= model.trees.length);
  
  // Final prediction is majority vote
  const finalClass = voteCounts.indexOf(Math.max(...voteCounts));
  const confidence = Math.max(...voteCounts) / predictions.length;
  
  // Calculate risk score (0-100)
  const riskScore = Math.round(
    avgProbabilities[0] * 0 +    // Safe = 0
    avgProbabilities[1] * 50 +   // Moderate = 50
    avgProbabilities[2] * 100    // High = 100
  );
  
  return {
    risk_level: finalClass,
    alert_level: model.class_names[finalClass],
    risk_score: riskScore,
    confidence: confidence,
    probabilities: avgProbabilities,
    tree_votes: {
      safe: voteCounts[0],
      moderate: voteCounts[1],
      high: voteCounts[2]
    }
  };
}

// Analyze water biology based on pH and turbidity
function analyze_water_biology(ph: number | null | undefined, turbidity: number | null | undefined): {
  possible_organism: string;
  health_advice: string;
} {
  // Handle missing values
  if (ph === null || ph === undefined || turbidity === null || turbidity === undefined) {
    return {
      possible_organism: "Not enough data to analyze water biology.",
      health_advice: "Not enough data to analyze water biology."
    };
  }

  // Validate pH range (0-14)
  if (ph < 0 || ph > 14) {
    return {
      possible_organism: "Invalid pH value. Please check your measurement.",
      health_advice: "Invalid pH value. Please check your measurement."
    };
  }

  // Validate turbidity (should be non-negative)
  if (turbidity < 0) {
    return {
      possible_organism: "Invalid turbidity value. Please check your measurement.",
      health_advice: "Invalid turbidity value. Please check your measurement."
    };
  }

  let possible_organism: string;
  let health_advice: string;

  // pH < 5.5 → fungi or iron bacteria, unsafe for drinking
  if (ph < 5.5) {
    possible_organism = "Fungi or Iron Bacteria";
    health_advice = "⚠️ UNSAFE FOR DRINKING: Water contains fungi or iron bacteria. Do not consume. Use alternative water sources or treat with proper filtration and disinfection.";
  }
  // 5.5 ≤ pH < 6.5 → sulfur-oxidizing bacteria, may corrode pipes
  else if (ph >= 5.5 && ph < 6.5) {
    possible_organism = "Sulfur-Oxidizing Bacteria";
    health_advice = "⚠️ CAUTION: Water may contain sulfur-oxidizing bacteria that can corrode pipes and cause unpleasant taste/odor. Boil water before drinking and consider water treatment.";
  }
  // 6.5 ≤ pH ≤ 7.5 and turbidity ≤ 5 → low microbial presence (safe)
  else if (ph >= 6.5 && ph <= 7.5 && turbidity <= 5) {
    possible_organism = "Low Microbial Presence (Safe)";
    health_advice = "✅ SAFE: Water quality appears good with low microbial presence. Continue maintaining good hygiene practices and regular monitoring.";
  }
  // 6.5 ≤ pH ≤ 7.5 and turbidity > 5 → E. coli / Protozoa contamination possible
  else if (ph >= 6.5 && ph <= 7.5 && turbidity > 5) {
    possible_organism = "E. coli / Protozoa (Giardia)";
    health_advice = "🔴 HIGH RISK: Possible E. coli or protozoan contamination (like Giardia). Boil water for at least 1 minute before drinking. Use water purification tablets or filters. Seek medical attention if symptoms develop.";
  }
  // 7.6 ≤ pH ≤ 8.5 → cyanobacteria (algae) likely
  else if (ph >= 7.6 && ph <= 8.5) {
    possible_organism = "Cyanobacteria (Algae)";
    health_advice = "⚠️ MODERATE RISK: Cyanobacteria (algae) may be present. While not always harmful, some types produce toxins. Boil water before drinking. If water has unusual color or odor, avoid consumption and seek alternative sources.";
  }
  // 8.6 ≤ pH ≤ 9.0 → sulfate-reducing bacteria (odor, unsafe)
  else if (ph >= 8.6 && ph <= 9.0) {
    possible_organism = "Sulfate-Reducing Bacteria";
    health_advice = "⚠️ UNSAFE: Water contains sulfate-reducing bacteria which can cause unpleasant odors and health issues. Do not drink. Use alternative water sources or professional water treatment.";
  }
  // pH > 9.0 → extreme alkaline, minimal life, chemically unsafe
  else {
    possible_organism = "Extreme Alkaline Conditions (Minimal Life)";
    health_advice = "🔴 CHEMICALLY UNSAFE: Water is extremely alkaline and chemically unsafe for consumption. Do not drink. Use alternative water sources immediately.";
  }

  return {
    possible_organism,
    health_advice
  };
}

// Analyze key contributing factors including predicted disease
function analyzeKeyFactors(features: Features, importances: Record<string, number>, predictedDisease?: string): string[] {
  const factors: string[] = [];
  const { fever, diarrhea, vomiting, pH, turbidity, disease_encoded } = features;
  
  // Add disease as primary factor if serious
  const seriousDiseases = ['Cholera', 'Typhoid', 'Hepatitis_A', 'Severe_Diarrheal_Disease'];
  if (predictedDisease && seriousDiseases.includes(predictedDisease.replace(/ /g, '_'))) {
    factors.push(`🚨 Predicted Disease: ${predictedDisease}`);
  } else if (predictedDisease && predictedDisease !== 'None') {
    factors.push(`⚠️ Predicted Disease: ${predictedDisease}`);
  }
  
  // Check each feature against thresholds and add if significant
  const checks = [
    { condition: diarrhea > 5, text: `High diarrhea cases (${diarrhea})`, importance: importances.diarrhea || 0 },
    { condition: turbidity > 5, text: `High water turbidity (${turbidity} NTU)`, importance: importances.turbidity || 0 },
    { condition: pH < 6.5 || pH > 8.5, text: `Unsafe pH level (${pH})`, importance: importances.pH || 0 },
    { condition: fever > 3, text: `Elevated fever cases (${fever})`, importance: importances.fever || 0 },
    { condition: vomiting > 2, text: `Concerning vomiting cases (${vomiting})`, importance: importances.vomiting || 0 }
  ];
  
  // Sort by importance and filter active conditions
  checks
    .filter(c => c.condition)
    .sort((a, b) => b.importance - a.importance)
    .forEach(c => factors.push(c.text));
  
  if (factors.length === 0) {
    factors.push("✅ All indicators within normal range");
  }
  
  return factors;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fever, diarrhea, vomiting, pH, turbidity, predictedDisease } = await req.json();
    
    console.log("=== ENHANCED RANDOM FOREST CLASSIFIER ===");
    console.log("Model:", trainedModel.model_type);
    console.log("Trees:", trainedModel.n_estimators);
    console.log("Training accuracy:", trainedModel.training_info.training_accuracy);
    console.log("Test accuracy:", trainedModel.training_info.test_accuracy);
    console.log("\nInput features:", { fever, diarrhea, vomiting, pH, turbidity, predictedDisease });
    
    // Encode disease name to numerical value
    const diseaseKey = predictedDisease ? predictedDisease.replace(/ /g, '_') : 'None';
    const disease_encoded = DISEASE_ENCODING[diseaseKey] || DISEASE_ENCODING['None'];
    console.log("Disease encoding:", diseaseKey, "=>", disease_encoded);
    
    // Make prediction using trained Random Forest
    const features: Features = { 
      fever, 
      diarrhea, 
      vomiting, 
      pH, 
      turbidity,
      disease_encoded
    };
    const prediction = predictRandomForest(trainedModel as TrainedModel, features);
    
    // Generate alert message based on risk level
    let alertMessage = "";
    if (prediction.risk_level === 2) {
      alertMessage = "🔴 HIGH RISK: Immediate action required! Water-borne disease outbreak likely. Boil all water, alert health authorities, and seek medical attention for affected individuals.";
    } else if (prediction.risk_level === 1) {
      alertMessage = "🟡 MODERATE RISK: Increased vigilance needed. Monitor symptoms closely, ensure water is boiled, and maintain strict hygiene practices.";
    } else {
      alertMessage = "🟢 SAFE ZONE: Conditions are normal. Continue good hygiene practices and regular water quality monitoring.";
    }
    
    const keyFactors = analyzeKeyFactors(features, trainedModel.feature_importances, predictedDisease);
    
    // Analyze water biology based on pH and turbidity
    const biologyAnalysis = analyze_water_biology(pH, turbidity);
    
    console.log("\n=== PREDICTION RESULTS ===");
    console.log("Risk Level:", prediction.alert_level);
    console.log("Confidence:", (prediction.confidence * 100).toFixed(1) + "%");
    console.log("Tree Votes:", prediction.tree_votes);
    console.log("Probabilities:", {
      safe: (prediction.probabilities[0] * 100).toFixed(1) + "%",
      moderate: (prediction.probabilities[1] * 100).toFixed(1) + "%",
      high: (prediction.probabilities[2] * 100).toFixed(1) + "%"
    });
    console.log("Key Factors:", keyFactors);
    console.log("\n=== WATER BIOLOGY ANALYSIS ===");
    console.log("Possible Organism:", biologyAnalysis.possible_organism);
    console.log("Health Advice:", biologyAnalysis.health_advice);

    return new Response(
      JSON.stringify({
        risk_level: prediction.risk_level,
        alert_level: prediction.alert_level,
        alert_message: alertMessage,
        risk_score: prediction.risk_score,
        confidence: Math.round(prediction.confidence * 100) / 100,
        key_factors: keyFactors,
        possible_organism: biologyAnalysis.possible_organism,
        health_advice: biologyAnalysis.health_advice,
        model_info: {
          algorithm: "Random Forest (scikit-learn trained)",
          num_trees: trainedModel.n_estimators,
          training_accuracy: trainedModel.training_info.training_accuracy,
          test_accuracy: trainedModel.training_info.test_accuracy,
          tree_votes: prediction.tree_votes,
          class_probabilities: {
            safe: Math.round(prediction.probabilities[0] * 100) / 100,
            moderate: Math.round(prediction.probabilities[1] * 100) / 100,
            high: Math.round(prediction.probabilities[2] * 100) / 100
          },
          feature_importances: trainedModel.feature_importances
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in predict-risk function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
