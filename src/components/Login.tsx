import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Hammer, LogIn, UserPlus, ChevronDown } from 'lucide-react';

const SAMPLE_ACCOUNTS = [
  { label: 'Manager', email: 'manager@bingo.test', role: 'Operations Manager' },
  { label: 'Warehouse Associate', email: 'jamie@bingo.test', role: 'Warehouse Associate' },
  { label: 'Lotting Specialist', email: 'sam@bingo.test', role: 'Lotting Specialist' },
  { label: 'Cashier', email: 'taylor@bingo.test', role: 'Cashier' },
  { label: 'Floor Lead', email: 'morgan@bingo.test', role: 'Floor Lead' },
];

export function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSamples, setShowSamples] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, fullName);
    setBusy(false);
    if (result.error) setError(result.error);
  }

  function fillSample(s: (typeof SAMPLE_ACCOUNTS)[number]) {
    setEmail(s.email);
    setPassword('Bingo2024!');
    setMode('signin');
    setShowSamples(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
              <Hammer className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">BinGo Auctions</h1>
            <p className="text-slate-400 mt-1 text-sm">Employee Training Hub</p>
          </div>

          <div className="card p-6 animate-fade-in">
            <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="label">Full name</label>
                  <input
                    className="input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                  />
                </div>
              )}
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@bingo.test"
                  required
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">{error}</p>
              )}

              <button type="submit" disabled={busy} className="btn-primary w-full">
                {mode === 'signin' ? (
                  <>
                    <LogIn className="w-5 h-5" />
                    {busy ? 'Signing in…' : 'Sign In'}
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    {busy ? 'Creating…' : 'Create Account'}
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowSamples((s) => !s)}
              className="w-full flex items-center justify-between rounded-xl bg-slate-800/50 px-4 py-3 text-sm text-slate-300 border border-slate-700"
            >
              <span className="font-medium">Sample accounts (password: Bingo2024!)</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showSamples ? 'rotate-180' : ''}`} />
            </button>
            {showSamples && (
              <div className="mt-2 space-y-2 animate-fade-in">
                {SAMPLE_ACCOUNTS.map((s) => (
                  <button
                    key={s.email}
                    onClick={() => fillSample(s)}
                    className="w-full flex items-center justify-between rounded-xl bg-slate-800/30 px-4 py-2.5 text-left border border-slate-700/50 hover:bg-slate-800/60 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{s.role}</p>
                      <p className="text-xs text-slate-500">{s.email}</p>
                    </div>
                    <span className="text-xs text-blue-400 font-medium">Use →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
