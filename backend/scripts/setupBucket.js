import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBucket() {
    console.log("Attempting to create buckets...");

    const buckets = ['csv-uploads', 'models'];

    for (const bucket of buckets) {
        const { data, error } = await supabase
            .storage
            .createBucket(bucket, {
                public: true,
                fileSizeLimit: bucket === 'models' ? 104857600 : 10485760, // 100MB for models, 10MB for csv
                allowedMimeTypes: bucket === 'models' ? ['application/octet-stream', 'application/x-pickle'] : ['text/csv', 'application/vnd.ms-excel']
            });

        if (error) {
            if (error.message.includes("already exists")) {
                console.log(`Bucket '${bucket}' already exists.`);
            } else {
                console.error(`Error creating bucket '${bucket}':`, error);
            }
        } else {
            console.log(`Bucket '${bucket}' created successfully!`);
        }
    }
}

createBucket();
