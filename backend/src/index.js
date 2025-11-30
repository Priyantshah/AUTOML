import dotenv from "dotenv";
import { app } from "./app.js";
import supabase from "./db/index.js";

dotenv.config({
    path: './.env'
});

const PORT = process.env.PORT || 8000;

// Increase timeout to 5 minutes
const server = app.listen(PORT, "0.0.0.0", async () => {
    console.log(`⚙️ Server is running at port : ${PORT}`);

    // Verify Supabase Connection
    try {
        const { data, error } = await supabase.storage.listBuckets();
        if (error) {
            console.error("❌ Supabase Connection Failed:", error.message);
        } else {
            console.log("✅ Supabase Connected Successfully!");
        }
    } catch (err) {
        console.error("❌ Supabase Connection Error:", err.message);
    }
});
server.setTimeout(300000); // 5 minutes

// Keep alive hack
setInterval(() => { }, 1000);
