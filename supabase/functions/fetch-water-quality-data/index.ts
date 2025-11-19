import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching water quality data from EPA Water Quality Portal...');
    
    // Using EPA Water Quality Portal API - real open dataset
    // Fetching pH and turbidity measurements from various monitoring stations
    const response = await fetch(
      'https://www.waterqualitydata.us/data/Result/search?' +
      'characteristicName=pH;Turbidity&' +
      'mimeType=json&' +
      'zip=no&' +
      'sorted=no&' +
      'dataProfile=narrowResult'
    );

    if (!response.ok) {
      throw new Error(`EPA API error: ${response.status}`);
    }

    const rawData = await response.json();
    console.log(`Fetched ${rawData.length} records from EPA`);

    // Transform EPA data into training format
    const trainingData = rawData
      .filter((record: any) => {
        const value = parseFloat(record.ResultMeasureValue);
        return !isNaN(value) && value > 0;
      })
      .slice(0, 500) // Limit to 500 records
      .map((record: any) => {
        const characteristic = record.CharacteristicName;
        const value = parseFloat(record.ResultMeasureValue);
        
        return {
          characteristic,
          value,
          location: record.MonitoringLocationIdentifier,
          date: record.ActivityStartDate
        };
      });

    // Group by location to create complete samples
    const groupedByLocation: Record<string, any> = {};
    
    trainingData.forEach((item: any) => {
      const loc = item.location;
      if (!groupedByLocation[loc]) {
        groupedByLocation[loc] = { location: loc, date: item.date };
      }
      
      if (item.characteristic.toLowerCase().includes('ph')) {
        groupedByLocation[loc].pH = item.value;
      } else if (item.characteristic.toLowerCase().includes('turbidity')) {
        groupedByLocation[loc].turbidity = item.value;
      }
    });

    // Create final training samples with simulated health outcomes
    const samples = Object.values(groupedByLocation)
      .filter((sample: any) => sample.pH && sample.turbidity)
      .map((sample: any) => {
        // Simulate health outcomes based on water quality thresholds
        let outcome = 0; // safe
        let fever = Math.floor(Math.random() * 3);
        let diarrhea = Math.floor(Math.random() * 4);
        let vomiting = Math.floor(Math.random() * 2);

        // Poor pH conditions (< 6.5 or > 8.5)
        if (sample.pH < 6.5 || sample.pH > 8.5) {
          outcome = 1; // moderate risk
          fever += Math.floor(Math.random() * 4) + 2;
          diarrhea += Math.floor(Math.random() * 5) + 3;
          vomiting += Math.floor(Math.random() * 3) + 1;
        }

        // High turbidity (> 5 NTU)
        if (sample.turbidity > 5) {
          outcome = Math.max(outcome, 1);
          diarrhea += Math.floor(Math.random() * 4) + 2;
        }

        // Very poor conditions
        if ((sample.pH < 6.0 || sample.pH > 9.0) && sample.turbidity > 8) {
          outcome = 2; // high risk
          fever += Math.floor(Math.random() * 7) + 5;
          diarrhea += Math.floor(Math.random() * 10) + 8;
          vomiting += Math.floor(Math.random() * 7) + 3;
        }

        return {
          fever,
          diarrhea,
          vomiting,
          pH: sample.pH,
          turbidity: sample.turbidity,
          outcome,
          source: 'EPA',
          location: sample.location,
          date: sample.date
        };
      });

    console.log(`Generated ${samples.length} training samples from EPA data`);

    return new Response(
      JSON.stringify({
        success: true,
        samples,
        metadata: {
          source: 'EPA Water Quality Portal',
          total_samples: samples.length,
          api_url: 'https://www.waterqualitydata.us'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching water quality data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
