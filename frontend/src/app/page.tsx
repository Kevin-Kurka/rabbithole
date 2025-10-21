"use client";
import Link from 'next/link';
import { BrainCircuit } from 'lucide-react';
import { theme } from '@/styles/theme';
export default function Home() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ backgroundColor: theme.colors.bg.primary }}
    >
      <div className="text-center mb-12">
        <BrainCircuit
          className="w-24 h-24 mx-auto mb-6"
          style={{ color: theme.colors.button.primary.bg }}
        />
        <h1
          className="text-5xl font-bold mb-4"
          style={{ color: theme.colors.text.primary }}
        >
          Rabbit Hole
        </h1>
        <p
          className="text-xl mb-2"
          style={{ color: theme.colors.text.secondary }}
        >
          Collaborative Knowledge Graphs for Evidence-Based Inquiry
        </p>
        <p
          className="text-sm"
          style={{ color: theme.colors.text.tertiary }}
        >
          Build, challenge, and verify interconnected theories using structured methodologies
        </p>
      </div>
      <div className="flex gap-4 mb-8">
        <Link
          href="/register"
          className="px-8 py-4 font-medium rounded transition-colors"
          style={{
            backgroundColor: theme.colors.button.primary.bg,
            color: theme.colors.button.primary.text,
            borderRadius: theme.radius.md,
          }}
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="px-8 py-4 font-medium rounded transition-colors"
          style={{
            backgroundColor: theme.colors.button.secondary.bg,
            color: theme.colors.button.secondary.text,
            borderRadius: theme.radius.md,
            border: `2px solid ${theme.colors.border.primary}`,
          }}
        >
          Login
        </Link>
        <Link
          href="/ledger"
          className="px-8 py-4 font-medium rounded transition-colors"
          style={{
            backgroundColor: 'transparent',
            color: theme.colors.text.secondary,
            borderRadius: theme.radius.md,
            border: `2px solid ${theme.colors.border.secondary}`,
          }}
        >
          Public Ledger
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        <div
          className="p-6 rounded"
          style={{
            backgroundColor: theme.colors.bg.secondary,
            border: `1px solid ${theme.colors.border.secondary}`,
          }}
        >
          <h3
            className="font-bold text-lg mb-2"
            style={{ color: theme.colors.text.primary }}
          >
            Level 0 & Level 1
          </h3>
          <p style={{ color: theme.colors.text.tertiary }}>
            Build theories on verified facts. Level 0 truth layer provides immutable foundation.
          </p>
        </div>
        <div
          className="p-6 rounded"
          style={{
            backgroundColor: theme.colors.bg.secondary,
            border: `1px solid ${theme.colors.border.secondary}`,
          }}
        >
          <h3
            className="font-bold text-lg mb-2"
            style={{ color: theme.colors.text.primary }}
          >
            Veracity Scores
          </h3>
          <p style={{ color: theme.colors.text.tertiary }}>
            Community-driven verification with transparent scoring (0.0-1.0).
          </p>
        </div>
        <div
          className="p-6 rounded"
          style={{
            backgroundColor: theme.colors.bg.secondary,
            border: `1px solid ${theme.colors.border.secondary}`,
          }}
        >
          <h3
            className="font-bold text-lg mb-2"
            style={{ color: theme.colors.text.primary }}
          >
            Real-Time Collaboration
          </h3>
          <p style={{ color: theme.colors.text.tertiary }}>
            See live updates as others edit, comment, and challenge claims.
          </p>
        </div>
      </div>
    </div>
  );
}
