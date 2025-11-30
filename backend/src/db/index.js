import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase URL or Key is missing!");
}

let supabase;

if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️ WARNING: Supabase URL or Key is missing in .env file. Database operations will fail.");
    // Create a dummy client or null to prevent immediate crash, or just don't initialize
    supabase = {
        storage: {
            from: () => ({
                upload: async () => ({ error: new Error("Supabase not configured") }),
                getPublicUrl: () => ({ data: { publicUrl: "" } })
            })
        }
    };
} else {
    supabase = createClient(supabaseUrl, supabaseKey);
}

export default supabase;
