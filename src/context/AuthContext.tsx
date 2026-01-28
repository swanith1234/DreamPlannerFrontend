import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

interface User {
    id: string;
    email: string;
    name: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (user: User) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const storedToken = localStorage.getItem('accessToken');
            const storedRefreshToken = localStorage.getItem('refreshToken');

            if (storedToken) {
                setToken(storedToken);
                try {
                    const { data } = await api.get('/auth/me');
                    setUser(data.user);
                } catch (error) {
                    // Start of auth check failure - maybe access token expired
                    // The client.ts interceptor might have already tried refreshing and updating localStorage
                    // So we check if tokens changed or just accept failure
                    console.error("Auth check failed", error);
                    // We don't auto-logout here immediately because client.ts handles 401 refresh
                    // But if it failed *after* all that, then we are done.
                }
            } else if (storedRefreshToken) {
                // Try to revive session via refresh token if access token is missing but refresh exists
                try {
                    const { data } = await api.post('/auth/refresh', { refreshToken: storedRefreshToken });
                    localStorage.setItem('accessToken', data.accessToken);
                    localStorage.setItem('refreshToken', data.refreshToken);
                    setToken(data.accessToken);
                    const me = await api.get('/auth/me');
                    setUser(me.data.user);
                } catch (e) {
                    logout();
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = (accessToken: string, refreshToken: string, newUser: User) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        setToken(accessToken);
        setUser(newUser);
    };

    const logout = async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            try {
                await api.post('/auth/logout', { refreshToken });
            } catch (e) {
                console.error("Logout API failed", e);
            }
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
