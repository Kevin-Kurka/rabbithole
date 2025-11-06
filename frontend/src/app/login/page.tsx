"use client";
import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { theme } from '@/styles/theme';
import { useEffect } from 'react';
export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Store user ID in sessionStorage when session is available
  useEffect(() => {
    if (session?.user?.id) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('userId', session.user.id);
      }
    }
  }, [session]);
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
        // Wait a moment for session to be set
        setTimeout(() => router.push('/'), 100);
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
        // Wait a moment for session to be set
        setTimeout(() => router.push('/'), 100);
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
    <div
      style={{ backgroundColor: theme.colors.bg.secondary }}
      className="min-h-screen flex items-center justify-center"
    >
      <div
        style={{
          backgroundColor: theme.colors.bg.primary,
          borderColor: theme.colors.border.primary,
          borderRadius: theme.radius.sm
        }}
        className="p-8 shadow-xl w-full max-w-md border"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 style={{ color: theme.colors.text.primary }} className="text-3xl font-bold mb-2">
            Welcome to Rabbit Hole
          </h1>
          <p style={{ color: theme.colors.text.secondary }}>
            Collaborative knowledge graph platform
          </p>
        </div>
        {/* Error Message */}
        {error && (
          <div
            style={{
              backgroundColor: `${theme.colors.bg.elevated}40`,
              borderColor: theme.colors.border.secondary,
              borderRadius: theme.radius.sm
            }}
            className="mb-4 p-3 border"
          >
            <p style={{ color: theme.colors.text.tertiary }} className="text-sm">{error}</p>
          </div>
        )}
        {/* Demo Login Button */}
        <button
          onClick={handleDemoLogin}
          disabled={loading}
          style={{
            backgroundColor: theme.colors.bg.elevated,
            color: theme.colors.text.primary,
            borderRadius: theme.radius.sm
          }}
          className="w-full mb-6 px-4 py-3 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.bg.elevated;
          }}
        >
          {loading ? 'Signing in...' : '🚀 Try Demo (No signup needed)'}
        </button>
        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div style={{ borderColor: theme.colors.border.secondary }} className="w-full border-t"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span
              style={{
                backgroundColor: theme.colors.bg.primary,
                color: theme.colors.text.tertiary
              }}
              className="px-2"
            >
              Or sign in with your account
            </span>
          </div>
        </div>
        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              style={{ color: theme.colors.text.secondary }}
              className="block text-sm font-medium mb-1"
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
              style={{
                backgroundColor: theme.colors.input.bg,
                borderColor: theme.colors.input.border,
                color: theme.colors.text.primary,
                borderRadius: theme.radius.sm
              }}
              className="w-full px-4 py-3 border focus:ring-2 focus:border-transparent transition-all duration-200 placeholder:text-zinc-400"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              style={{ color: theme.colors.text.secondary }}
              className="block text-sm font-medium mb-1"
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
              style={{
                backgroundColor: theme.colors.input.bg,
                borderColor: theme.colors.input.border,
                color: theme.colors.text.primary,
                borderRadius: theme.radius.sm
              }}
              className="w-full px-4 py-3 border focus:ring-2 focus:border-transparent transition-all duration-200 placeholder:text-zinc-400"
              placeholder="••••••••"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                style={{
                  backgroundColor: theme.colors.input.bg,
                  borderColor: theme.colors.input.border,
                  borderRadius: theme.radius.sm
                }}
                className="h-4 w-4"
              />
              <label
                htmlFor="remember"
                style={{ color: theme.colors.text.secondary }}
                className="ml-2 block text-sm"
              >
                Remember me
              </label>
            </div>
            <Link
              href="/forgot-password"
              style={{ color: theme.colors.text.tertiary }}
              className="text-sm hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: theme.colors.bg.elevated,
              color: theme.colors.text.primary,
              borderRadius: theme.radius.sm
            }}
            className="w-full px-4 py-3 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bg.elevated;
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        {/* Register Link */}
        <p style={{ color: theme.colors.text.tertiary }} className="mt-6 text-center text-sm">
          Don't have an account?{' '}
          <Link
            href="/register"
            style={{ color: theme.colors.text.secondary }}
            className="font-medium hover:underline"
          >
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
}
