"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // TODO: Implement actual password reset logic
    // For now, just simulate the process
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
    }, 1000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Check Your Email
          </h1>

          <p className="text-gray-600 mb-6">
            We've sent password reset instructions to:
            <br />
            <span className="font-medium text-gray-900">{email}</span>
          </p>

          <p className="text-sm text-gray-500 mb-6">
            Didn't receive the email? Check your spam folder or try again.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => setSubmitted(false)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
            >
              Try different email
            </button>

            <Link
              href="/login"
              className="block w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 text-center"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reset Password
          </h1>
          <p className="text-gray-600">
            Enter your email and we'll send you instructions to reset your password
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? 'Sending...' : 'Send reset instructions'}
          </button>
        </form>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
            ← Back to login
          </Link>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Password reset functionality is coming soon. For now, please contact support or use the demo account.
          </p>
        </div>
      </div>
    </div>
  );
}
