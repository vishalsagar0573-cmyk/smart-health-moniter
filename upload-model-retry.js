
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load env vars manually
const envContent = fs.readFileSync('.env.local', 'utf-8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envConfig[key] = value;
    }
});

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY);

async function uploadModel() {
    const bucketName = 'water-samples'; // Use existing public bucket
    const filePath = 'supabase/functions/predict-disease/trained_disease_model.json';
    const fileName = 'trained_disease_model.json';

    console.log(`Reading file from ${filePath}...`);
    try {
        const fileContent = fs.readFileSync(filePath);
        console.log(`File read. Size: ${fileContent.length} bytes.`);

        console.log(`Uploading to ${bucketName}...`);
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, fileContent, {
                contentType: 'application/json',
                upsert: true
            });

        if (error) {
            console.error('Upload failed:', error);
        } else {
            console.log('Upload successful!');
            const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(fileName);
            console.log('Model Public URL:', publicUrl);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

uploadModel();
