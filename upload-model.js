
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually
const envContent = fs.readFileSync('.env.local', 'utf-8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
        envConfig[key] = value;
    }
});

const SUPABASE_URL = envConfig.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function uploadModel() {
    const bucketName = 'models';
    const filePath = 'supabase/functions/predict-disease/trained_disease_model.json';
    const fileName = 'trained_disease_model.json';

    console.log(`Checking for bucket '${bucketName}'...`);

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
        console.error('Error listing buckets:', listError);
        return;
    }

    const bucketExists = buckets.find(b => b.name === bucketName);

    if (!bucketExists) {
        console.log(`Bucket '${bucketName}' does not exist. Attempting to create...`);
        const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true
        });

        if (createError) {
            console.error('Error creating bucket:', createError);
            console.log("Falling back to 'water-samples' bucket...");
            return uploadToBucket('water-samples', filePath, fileName);
        }
        console.log(`Bucket '${bucketName}' created.`);
    }

    await uploadToBucket(bucketName, filePath, fileName);
}

async function uploadToBucket(bucketName, filePath, fileName) {
    console.log(`Uploading ${fileName} to ${bucketName}...`);

    try {
        const fileContent = fs.readFileSync(filePath);
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
        console.error('Error reading file:', err);
    }
}

uploadModel();
