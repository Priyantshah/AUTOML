import axios from 'axios';

const client = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add interceptor for multipart/form-data if needed, but axios handles it automatically if data is FormData
// We can add error handling interceptors here too

export default client;
