import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Validating water sample image...");

    // First, validate that the image is a valid water sample (water in white cup/bottle)
    const validationResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an image validation expert. Your task is to determine if an uploaded image shows a valid water sample photo.

A valid water sample photo must contain:
- Water (liquid) visible in the image
- The water must be in a white cup, white bottle, or white container
- The container should be clearly visible and white/light colored

Invalid images include:
- Images without water
- Water in non-white containers (colored cups, bottles, etc.)
- Images that don't show a water sample at all
- Random photos, landscapes, people, animals, or other objects

Respond ONLY with a JSON object in this exact format:
{
  "is_valid": boolean,
  "reason": "brief explanation of why it is or isn't valid"
}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Is this image a valid water sample photo showing water in a white cup or white bottle? Respond with JSON only."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ]
      }),
    });

    if (!validationResponse.ok) {
      const errorText = await validationResponse.text();
      console.error("Validation AI gateway error:", validationResponse.status, errorText);
      throw new Error(`Image validation failed: ${validationResponse.status}`);
    }

    const validationData = await validationResponse.json();
    const validationContent = validationData.choices?.[0]?.message?.content;

    if (!validationContent) {
      throw new Error("No validation result from AI");
    }

    console.log("Validation AI Response:", validationContent);

    // Parse the validation JSON response
    const validationJsonMatch = validationContent.match(/\{[\s\S]*\}/);
    if (!validationJsonMatch) {
      throw new Error("Could not extract JSON from validation response");
    }

    const validation = JSON.parse(validationJsonMatch[0]);
    console.log("Extracted validation:", validation);

    // If image is not valid, return error
    if (!validation.is_valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Image is not a valid water sample. Report not submitted. Please upload a photo of water in a white cup/bottle.",
          is_valid: false
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Image validated successfully. Proceeding with analysis...");

    // Get OpenCV service URL from environment variable (optional)
    const OPENCV_SERVICE_URL = Deno.env.get("OPENCV_SERVICE_URL") || "http://localhost:8000";
    
    // Run AI and OpenCV analysis in parallel for hybrid approach
    const [aiAnalysis, opencvAnalysis] = await Promise.allSettled([
      // AI Analysis
      (async () => {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a water quality analysis expert. Analyze the uploaded water sample image and extract these metrics.

IMPORTANT - Lighting Normalization:
- Account for varying lighting conditions (shadows, reflections, ambient light)
- Normalize brightness values to compensate for underexposed or overexposed images
- Focus on relative color ratios rather than absolute values
- Ignore background - analyze only the water sample itself

Extract these metrics:
- Average Red (avg_R): 0-255 scale (normalized)
- Average Green (avg_G): 0-255 scale (normalized)
- Average Blue (avg_B): 0-255 scale (normalized)
- Brightness: 0-255 scale (normalized to standard lighting)
- Estimated pH: 6.0-8.5 range (based on color and clarity, compensated for lighting)
- Estimated Turbidity: 0-10 NTU scale (based on cloudiness and clarity)

Respond ONLY with a JSON object in this exact format:
{
  "avg_R": number,
  "avg_G": number,
  "avg_B": number,
  "brightness": number,
  "water_ph": number,
  "water_turbidity": number,
  "analysis": "brief description of water quality"
}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this water sample image and provide the water quality metrics."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No analysis result from AI");
    }

    console.log("AI Response:", content);

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from AI response");
    }

    const aiAnalysisResult = JSON.parse(jsonMatch[0]);
    console.log("Extracted AI analysis:", aiAnalysisResult);
    
    return { success: true, data: aiAnalysisResult };
      })().catch((error) => {
        console.error("AI analysis error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
      }),
      
      // OpenCV Analysis
      (async () => {
        try {
          console.log("Calling OpenCV service...");
          const opencvResponse = await fetch(`${OPENCV_SERVICE_URL}/analyze`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ imageUrl }),
          });

          if (!opencvResponse.ok) {
            const errorText = await opencvResponse.text();
            console.warn("OpenCV service error:", opencvResponse.status, errorText);
            throw new Error(`OpenCV analysis failed: ${opencvResponse.status}`);
          }

          const opencvData = await opencvResponse.json();
          console.log("OpenCV analysis result:", opencvData);
          
          if (opencvData.success) {
            return { success: true, data: opencvData };
          } else {
            throw new Error(opencvData.error || "OpenCV analysis failed");
          }
        } catch (error) {
          console.warn("OpenCV analysis error:", error);
          return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
      })()
    ]);

    // Process results
    const aiResult = aiAnalysis.status === "fulfilled" && aiAnalysis.value.success 
      ? aiAnalysis.value.data 
      : null;
    
    const opencvResult = opencvAnalysis.status === "fulfilled" && opencvAnalysis.value.success
      ? opencvAnalysis.value.data
      : null;

    // Determine analysis method
    let analysisMethod = "ai_only";
    if (aiResult && opencvResult) {
      analysisMethod = "hybrid";
    } else if (opencvResult) {
      analysisMethod = "opencv_only";
    }

    // Combine results with weighted average
    let finalPh: number;
    let finalTurbidity: number;
    let avgR: number;
    let avgG: number;
    let avgB: number;
    let brightness: number;
    let analysis: string;

    if (aiResult && opencvResult) {
      // Hybrid: Weighted average (60% AI, 40% OpenCV for better accuracy)
      finalPh = (aiResult.water_ph * 0.6) + (opencvResult.water_ph * 0.4);
      finalTurbidity = (aiResult.water_turbidity * 0.6) + (opencvResult.water_turbidity * 0.4);
      avgR = (aiResult.avg_R * 0.6) + (opencvResult.avg_R * 0.4);
      avgG = (aiResult.avg_G * 0.6) + (opencvResult.avg_G * 0.4);
      avgB = (aiResult.avg_B * 0.6) + (opencvResult.avg_B * 0.4);
      brightness = (aiResult.brightness * 0.6) + (opencvResult.brightness * 0.4);
      analysis = `Hybrid analysis: ${opencvResult.quality_level || "Normal"} quality. pH: ${finalPh.toFixed(1)}, Turbidity: ${finalTurbidity.toFixed(2)} NTU`;
    } else if (opencvResult) {
      // OpenCV only
      finalPh = opencvResult.water_ph;
      finalTurbidity = opencvResult.water_turbidity;
      avgR = opencvResult.avg_R;
      avgG = opencvResult.avg_G;
      avgB = opencvResult.avg_B;
      brightness = opencvResult.brightness;
      analysis = opencvResult.analysis || `OpenCV analysis: pH: ${finalPh.toFixed(1)}, Turbidity: ${finalTurbidity.toFixed(2)} NTU`;
    } else if (aiResult) {
      // AI only (fallback)
      finalPh = aiResult.water_ph;
      finalTurbidity = aiResult.water_turbidity;
      avgR = aiResult.avg_R;
      avgG = aiResult.avg_G;
      avgB = aiResult.avg_B;
      brightness = aiResult.brightness;
      analysis = aiResult.analysis || `AI analysis: pH: ${finalPh.toFixed(1)}, Turbidity: ${finalTurbidity.toFixed(2)} NTU`;
    } else {
      throw new Error("Both AI and OpenCV analysis failed");
    }

    // Validate results are within expected ranges
    finalPh = Math.max(6.0, Math.min(8.5, finalPh));
    finalTurbidity = Math.max(0.0, Math.min(10.0, finalTurbidity));

    console.log("Final combined analysis:", {
      method: analysisMethod,
      ph: finalPh,
      turbidity: finalTurbidity,
      ai_ph: aiResult?.water_ph,
      opencv_ph: opencvResult?.water_ph,
      ai_turbidity: aiResult?.water_turbidity,
      opencv_turbidity: opencvResult?.water_turbidity
    });

    return new Response(
      JSON.stringify({
        success: true,
        water_ph: parseFloat(finalPh.toFixed(1)),
        water_turbidity: parseFloat(finalTurbidity.toFixed(2)),
        avg_R: parseFloat(avgR.toFixed(1)),
        avg_G: parseFloat(avgG.toFixed(1)),
        avg_B: parseFloat(avgB.toFixed(1)),
        brightness: parseFloat(brightness.toFixed(1)),
        analysis: analysis,
        analysis_method: analysisMethod,
        // Include individual results for comparison
        ai_ph: aiResult?.water_ph || null,
        ai_turbidity: aiResult?.water_turbidity || null,
        opencv_ph: opencvResult?.water_ph || null,
        opencv_turbidity: opencvResult?.water_turbidity || null,
        opencv_quality_level: opencvResult?.quality_level || null,
        opencv_quality_score: opencvResult?.quality_score || null
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-water-image function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
