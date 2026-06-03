import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const { addToast } = useToast();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
    } catch (err) {
      addToast(err.response?.data?.error || 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-turf-bg p-6 relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-turf-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-turf-surface border border-turf-border mb-4 animate-pulse-glow">
            <span className="text-3xl">🗺️</span>
          </div>
          <h1 className="font-display text-4xl font-black text-white tracking-tight">
            TURF<span className="text-turf-accent">WAR</span>
          </h1>
          <p className="text-turf-muted text-sm mt-1 font-body">Claim the streets. Defend your ground.</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-turf-surface border border-turf-border p-1 mb-6">
          {['login', 'register'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-display font-semibold transition-all duration-200 ${
                mode === m
                  ? 'bg-turf-accent text-black'
                  : 'text-turf-muted hover:text-turf-text'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Join Game'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-display font-semibold text-turf-muted uppercase tracking-wider mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                minLength={3}
                maxLength={20}
                placeholder="YourCallsign"
                className="w-full bg-turf-surface border border-turf-border rounded-xl px-4 py-3 text-turf-text font-body placeholder:text-turf-muted/50 focus:outline-none focus:border-turf-accent transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-display font-semibold text-turf-muted uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="runner@example.com"
              className="w-full bg-turf-surface border border-turf-border rounded-xl px-4 py-3 text-turf-text font-body placeholder:text-turf-muted/50 focus:outline-none focus:border-turf-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-display font-semibold text-turf-muted uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full bg-turf-surface border border-turf-border rounded-xl px-4 py-3 text-turf-text font-body placeholder:text-turf-muted/50 focus:outline-none focus:border-turf-accent transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-turf-accent text-black font-display font-bold text-base tracking-wide transition-all duration-200 hover:bg-turf-accentDim active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                {mode === 'login' ? 'Signing In...' : 'Creating Account...'}
              </span>
            ) : (
              mode === 'login' ? '▶ Enter Game' : '🚀 Start Running'
            )}
          </button>
        </form>

        <p className="text-center text-turf-muted/60 text-xs mt-6 font-body">
          GPS tracking requires location permission
        </p>
      </div>
    </div>
  );
}
