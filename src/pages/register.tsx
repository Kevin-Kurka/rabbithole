import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, username, displayName);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8 font-mono">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2 text-crt-fg">&gt;</h1>
          <h2 className="text-3xl font-bold text-crt-fg">[ create account ]</h2>
          <p className="mt-2 text-crt-muted">join the rabbit hole</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-black p-8 border border-crt-border">
          {error && (
            <div className="p-4 text-sm text-crt-error border border-crt-error bg-black">
              [ ERROR ] {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-crt-fg">
              email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full border border-crt-border bg-black px-3 py-2 text-crt-fg placeholder-crt-dim focus:border-crt-fg focus:outline-none sm:text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-crt-fg">
              username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1 block w-full border border-crt-border bg-black px-3 py-2 text-crt-fg placeholder-crt-dim focus:border-crt-fg focus:outline-none sm:text-sm"
              placeholder="your_username"
            />
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-crt-fg">
              display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="mt-1 block w-full border border-crt-border bg-black px-3 py-2 text-crt-fg placeholder-crt-dim focus:border-crt-fg focus:outline-none sm:text-sm"
              placeholder="Your Full Name"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-crt-fg">
              password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full border border-crt-border bg-black px-3 py-2 text-crt-fg placeholder-crt-dim focus:border-crt-fg focus:outline-none sm:text-sm"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-crt-fg">
              confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mt-1 block w-full border border-crt-border bg-black px-3 py-2 text-crt-fg placeholder-crt-dim focus:border-crt-fg focus:outline-none sm:text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-crt-fg text-sm font-medium text-crt-fg bg-crt-selection hover:border-crt-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '[ creating account... ]' : '[ create account ]'}
          </button>
        </form>

        <p className="text-center text-sm text-crt-muted">
          already have an account?{' '}
          <Link to="/login" className="text-crt-fg hover:text-crt-accent font-medium">
            sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
