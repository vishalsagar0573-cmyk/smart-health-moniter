
import fs from 'fs';
import zlib from 'zlib';

const input = 'supabase/functions/predict-disease/trained_disease_model.json';
const output = 'supabase/functions/predict-disease/trained_disease_model.json.gz';

const inp = fs.createReadStream(input);
const out = fs.createWriteStream(output);
const gzip = zlib.createGzip();

inp.pipe(gzip).pipe(out);

out.on('finish', () => {
    console.log('Compression complete.');
    const stats = fs.statSync(output);
    console.log(`Original size: ${fs.statSync(input).size}`);
    console.log(`Compressed size: ${stats.size}`);
});
