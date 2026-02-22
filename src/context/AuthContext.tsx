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

// Wakes up the Render backend + checks auth within a timeout.
// If the backend takes > 12 s (cold start), we treat the user as not logged in
// so the UI doesn't stay black forever — the user can try again once it's warm.
const TIMEOUT_MS = 12_000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        // Safety valve — if backend is cold-starting, don't block UI forever
        const timer = setTimeout(() => {
            controller.abort();
            setTimedOut(true);
            setLoading(false);
        }, TIMEOUT_MS);

        const checkAuth = async () => {
            try {
                const { data } = await api.get('/auth/me', {
                    signal: controller.signal,
                });
                setUser(data.user);
            } catch (error: any) {
                // Aborted (timeout) or genuine 401 — either way, not authenticated right now
                setUser(null);
            } finally {
                clearTimeout(timer);
                setLoading(false);
            }
        };

        checkAuth();

        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, []);

    const login = (newUser: User) => {
        setUser(newUser);
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (e) {
            console.error('Logout API failed', e);
        }
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
            {loading ? (
                // Full-screen loading state shown while waiting for /auth/me
                // Prevents the black screen on Render cold starts
                <div style={{
                    height: '100dvh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--color-bg, #0a0a12)',
                    gap: '20px',
                }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        border: '3px solid rgba(108,99,255,0.2)',
                        borderTopColor: '#6c63ff',
                        borderRightColor: '#00d4ff',
                        animation: 'spin 1.2s linear infinite',
                    }} />
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', margin: 0 }}>
                        {timedOut ? 'Backend waking up… please wait' : 'Loading…'}
                    </p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : (
                children
            )}
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
