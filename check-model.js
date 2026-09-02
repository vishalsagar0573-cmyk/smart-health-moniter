
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

async function checkFile() {
    const { data, error } = await supabase.storage.from('water-samples').list();
    if (error) {
        console.error('Error listing files:', error);
        return;
    }

    const file = data.find(f => f.name === 'trained_disease_model.json');
    if (file) {
        const { data: { publicUrl } } = supabase.storage.from('water-samples').getPublicUrl('trained_disease_model.json');
        console.log('File found!');
        console.log('URL:', publicUrl);
    } else {
        console.log('File not found in water-samples bucket.');
    }
}

checkFile();
