"use client";
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { X, LogIn } from 'lucide-react';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginDialog({ isOpen, onClose }: LoginDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password. Please try again.');
      } else if (result?.ok) {
        onClose();
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email: 'test@example.com',
        password: 'test',
        redirect: false,
      });

      if (result?.ok) {
        onClose();
      } else {
        setError('Demo login failed. Please try manual login.');
      }
    } catch (err) {
      setError('Demo login failed. Please try manual login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-black border border-gray-500 rounded-sm shadow-2xl w-full max-w-md mx-4" style={{ borderWidth: '0.6px' }}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2 text-white" style={{ fontFamily: 'Arial, sans-serif' }}>
              Sign In
            </h2>
            <p className="text-gray-400" style={{ fontFamily: 'Arial, sans-serif' }}>
              Access your knowledge graphs
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded-sm" style={{ borderWidth: '0.6px' }}>
              <p className="text-sm text-red-400" style={{ fontFamily: 'Arial, sans-serif' }}>{error}</p>
            </div>
          )}

          {/* Demo Login Button */}
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full mb-4 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {loading ? 'Signing in...' : '🚀 Try Demo (No signup needed)'}
          </button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" style={{ borderWidth: '0.6px' }}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-black text-gray-500" style={{ fontFamily: 'Arial, sans-serif' }}>
                Or sign in with your account
              </span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1 text-gray-400"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-sm focus:outline-none focus:border-white transition-colors placeholder-gray-600"
                style={{ fontFamily: 'Arial, sans-serif', borderWidth: '0.6px' }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1 text-gray-400"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-sm focus:outline-none focus:border-white transition-colors placeholder-gray-600"
                style={{ fontFamily: 'Arial, sans-serif', borderWidth: '0.6px' }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-white hover:bg-gray-200 text-black rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              <LogIn size={16} />
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Register Link */}
          <p className="mt-4 text-center text-sm text-gray-500" style={{ fontFamily: 'Arial, sans-serif' }}>
            Don't have an account?{' '}
            <a
              href="/register"
              className="text-white hover:underline font-medium"
            >
              Create one now
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}