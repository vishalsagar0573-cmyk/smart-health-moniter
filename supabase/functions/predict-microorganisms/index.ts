import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import modelData from './model.json' assert { type: "json" };

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { symptoms, pH, turbidity } = await req.json()

        // 1. Prepare Features
        const featureNames = modelData.features;
        const features: Record<string, number> = {};

        // Initialize all to 0
        featureNames.forEach((f: string) => features[f] = 0);

        // Set symptoms
        if (symptoms && Array.isArray(symptoms)) {
            symptoms.forEach((s: string) => {
                // Normalize symptom string to match training keys
                // Training keys: "diarrhea", "vomiting", "fever", "stomach_pain", etc.
                // Input might be "diarrhea", "stomach_pain" (from frontend)

                // Try exact match first
                if (Object.prototype.hasOwnProperty.call(features, s)) {
                    features[s] = 1;
                } else {
                    // Try normalizing (replace spaces with underscores)
                    const normalized = s.toLowerCase().replace(/ /g, "_");
                    if (Object.prototype.hasOwnProperty.call(features, normalized)) {
                        features[normalized] = 1;
                    }

                    // Handle specific mappings if needed
                    if (s === "loss_appetite" || s === "nausea") features["nausea"] = 1; // Map related
                }
            });
        }

        features['pH'] = (pH !== undefined && pH !== null) ? Number(pH) : 7.0;
        features['turbidity'] = (turbidity !== undefined && turbidity !== null) ? Number(turbidity) : 0.0;

        // Convert to array in correct order (matching training columns)
        const featureVector = featureNames.map((f: string) => features[f]);

        // 2. Inference
        const results: Record<string, number> = {};
        const predictions: string[] = [];

        // Iterate over each binary model (one per microorganism)
        for (const [className, trees] of Object.entries(modelData.models)) {
            let voteSum = 0;
            const numTrees = (trees as any[]).length;

            for (const tree of (trees as any[])) {
                voteSum += predictTree(tree, featureVector);
            }

            const probability = voteSum / numTrees;

            // Threshold can be tuned. 0.5 is standard.
            if (probability >= 0.5) {
                predictions.push(className);
                results[className] = parseFloat(probability.toFixed(2));
            }
        }

        // 3. Construct Message
        let message = "Water quality analysis complete.";
        if (predictions.length > 0) {
            message = `Potential contamination detected: ${predictions.join(", ")}. Immediate water treatment required.`;
        } else {
            message = "No specific microorganisms detected based on current data.";
        }

        return new Response(
            JSON.stringify({
                microorganisms: predictions,
                confidence_scores: results,
                message: message
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})

function predictTree(node: any, features: number[]): number {
    if (node.t === 'l') { // Leaf
        return node.v; // Probability of class 1
    }

    // Split
    const featureVal = features[node.f];
    if (featureVal <= node.v) {
        return predictTree(node.l, features);
    } else {
        return predictTree(node.r, features);
    }
}
