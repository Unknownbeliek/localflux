import React, { useState } from 'react';
import { useHostAuth } from '../context/HostAuthProvider';
import { Lock, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';

export function HostLoginModal({ onSuccess }) {
  const { loginWithPassword } = useHostAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsSubmitting(true);
    setError('');

    const result = await loginWithPassword(password);
    setIsSubmitting(false);

    if (result.success) {
      if (onSuccess) onSuccess();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
        <div className="flex items-center space-x-3 text-cyan-400">
          <div className="p-3 bg-cyan-950/60 rounded-xl border border-cyan-500/30">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Host Authentication</h2>
            <p className="text-xs text-slate-400">Enter password to access Admin Dashboard</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Host Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter host password..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !password.trim()}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-600/20 active:scale-[0.98]"
          >
            <span>{isSubmitting ? 'Authenticating...' : 'Access Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-xs text-center text-slate-500">
          LocalFlux v2.0.0 Hybrid • Protected Host Session
        </p>
      </div>
    </div>
  );
}
