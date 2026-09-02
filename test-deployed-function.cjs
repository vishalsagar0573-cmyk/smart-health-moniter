
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPrediction() {
    console.log('Testing predict-disease function with user symptoms...')

    // Symptoms from user screenshot: Diarrhea, Fever, Dehydration
    const payload = {
        symptoms: ["diarrhea", "fever", "dehydration"],
        peopleAffected: 1
    }

    const { data, error } = await supabase.functions.invoke('predict-disease', {
        body: payload
    })

    if (error) {
        console.error('Function error:', error)
    } else {
        console.log('Function response:', JSON.stringify(data, null, 2))
    }
}

testPrediction()
