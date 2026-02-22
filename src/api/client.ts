import axios from 'axios';

// In production, VITE_API_URL is set to the Render backend URL (via Vercel env vars).
// Locally, it's empty — we rely on Vite's dev server proxy (/api -> http://localhost:3000).
const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

console.log("base url", import.meta.env.VITE_API_URL);

// Request interceptor: No need to attach token manually (cookies handle it)
api.interceptors.request.use((config) => {
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Refresh endpoint now uses cookies automatically
                await axios.post(
                    `${BASE_URL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                // Retry original request
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed - redirect to login
                if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
