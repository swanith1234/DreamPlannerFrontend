import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import axios from 'axios';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:4000/api/auth/login', {
        username,
        password
      });
      localStorage.setItem('adminToken', response.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-slate-900)_0%,_var(--color-slate-950)_100%)] opacity-80" />
      
      <div className="glass-panel w-full max-w-md p-8 relative z-10 shadow-2xl shadow-cyan-500/10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-cyan-500/50 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Lock className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-wider text-slate-100 neon-text-cyan">AetherFlow Command</h1>
          <p className="text-slate-400 mt-2 text-sm font-mono">AUTHORIZED PERSONNEL ONLY</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
              </div>
              <input
                type="text"
                required
                className="w-full pl-10 pr-3 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                placeholder="ADMIN_USERNAME"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
              </div>
              <input
                type="password"
                required
                className="w-full pl-10 pr-3 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                placeholder="ADMIN_PASSWORD"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm font-mono text-center neon-text-red">
              [{error.toUpperCase()}]
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold tracking-wider uppercase transition-colors shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : 'Initialize Link'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
