import { spawn } from "child_process";

export const runPython = (args, onData) => {
    return new Promise((resolve, reject) => {
        const py = spawn("python", args);

        let output = "";
        let error = "";
        let lineBuffer = "";

        py.stdout.on("data", (d) => {
            const str = d.toString();
            output += str;

            if (onData) {
                lineBuffer += str;
                const lines = lineBuffer.split('\n');
                // Keep the last partial line
                lineBuffer = lines.pop();

                lines.forEach(line => {
                    if (line.startsWith("PROGRESS:")) {
                        const progress = parseInt(line.split(":")[1].trim());
                        onData({ progress });
                    }
                });
            }
        });

        py.stderr.on("data", (d) => (error += d.toString()));

        py.on("close", () => {
            if (error) {
                console.error("Python Stderr:", error);
            }

            try {
                // Filter out progress lines
                const lines = output.split('\n').filter(line => !line.startsWith("PROGRESS:"));
                const cleanOutput = lines.join('\n').trim();

                // Attempt 1: Parse the whole cleaned output
                try {
                    return resolve(JSON.parse(cleanOutput));
                } catch (e) {
                    // Attempt 2: Find the last line that looks like a JSON object
                    // This helps if there are warnings printed before the JSON
                    for (let i = lines.length - 1; i >= 0; i--) {
                        const line = lines[i].trim();
                        if (line.startsWith('{') && line.endsWith('}')) {
                            try {
                                return resolve(JSON.parse(line));
                            } catch (innerE) {
                                continue;
                            }
                        }
                    }
                    // Attempt 3: Regex to find the largest JSON-like block (fallback)
                    const jsonMatch = cleanOutput.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        return resolve(JSON.parse(jsonMatch[0]));
                    }

                    throw e; // Throw original error if all attempts fail
                }
            } catch (e) {
                console.error("Python Output Parse Error:", e);
                console.error("Raw Output:", output);
                if (error) return reject(error);
                return reject(new Error("Failed to parse Python script output. Check server logs for details."));
            }
        });
    });
};
