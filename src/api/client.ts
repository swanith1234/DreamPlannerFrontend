import axios from 'axios';

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api` || 'https://dreamplanner-lbm7.onrender.com/api',
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
                    `${import.meta.env.VITE_API_URL || ''}/api/auth/refresh`,
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
