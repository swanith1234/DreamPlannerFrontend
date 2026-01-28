import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import GlowButton from '../components/GlowButton';
import PageTransition from '../components/PageTransition';
import PageLoader from '../components/PageLoader';

const RegisterPage: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.post('/auth/signup', { name, email, password });
            login(data.user);
            navigate('/app/home');
        } catch (err: unknown) {
            if (axios.isAxiosError(err) && err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Registration failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'white',
        marginBottom: '16px',
        outline: 'none',
        transition: 'border-color 0.3s'
    };

    return (
        <PageTransition>
            {loading && <PageLoader />}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'var(--color-bg-primary)'
            }}>
                <GlassCard style={{ width: '100%', maxWidth: '400px' }}>
                    <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Begin Your Journey</h2>

                    {error && <p style={{ color: 'var(--color-danger)', marginBottom: '16px', textAlign: 'center' }}>{error}</p>}

                    <form onSubmit={handleSubmit}>
                        <div>
                            <input
                                type="text"
                                placeholder="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={inputStyle}
                                required
                            />
                        </div>
                        <div>
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={inputStyle}
                                required
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={inputStyle}
                                required
                            />
                        </div>
                        <GlowButton type="submit" fullWidth>
                            Join DreamPlanner
                        </GlowButton>
                    </form>

                    <p style={{ marginTop: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                        Already have an account? <Link to="/login" style={{ color: 'var(--color-accent)' }}>Login</Link>
                    </p>
                </GlassCard>
            </div>
        </PageTransition>
    );
};

export default RegisterPage;
