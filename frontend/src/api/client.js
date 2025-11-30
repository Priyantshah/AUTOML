import axios from 'axios';


let baseURL = import.meta.env.VITE_API_URL || '/api';

// Ensure baseURL ends with /api if it's an absolute URL
if (baseURL !== '/api') {
    // Remove trailing slash if present
    if (baseURL.endsWith('/')) {
        baseURL = baseURL.slice(0, -1);
    }
    // Append /api if not present
    if (!baseURL.endsWith('/api')) {
        baseURL += '/api';
    }
}

console.log('API Client Base URL:', baseURL);

const client = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add interceptor for multipart/form-data if needed, but axios handles it automatically if data is FormData
// We can add error handling interceptors here too

export default client;
