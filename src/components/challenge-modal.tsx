import { useState } from 'react';
import { CHALLENGE_TEMPLATES } from '../lib/challenge-templates';
import type { ChallengeFramework } from '../lib/types';

interface ChallengeModalProps {
  isOpen: boolean;
  claimText: string;
  onSubmit: (
    title: string,
    rationale: string,
    framework?: ChallengeFramework,
    checkedCriteria?: string[]
  ) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ChallengeModal({
  isOpen,
  claimText,
  onSubmit,
  onCancel,
  isLoading = false,
}: ChallengeModalProps) {
  const [step, setStep] = useState<'framework' | 'criteria' | 'challenge'>('framework');
  const [selectedFramework, setSelectedFramework] = useState<ChallengeFramework | null>(null);
  const [checkedCriteria, setCheckedCriteria] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [rationale, setRationale] = useState('');

  if (!isOpen) return null;

  const frameworks: ChallengeFramework[] = [
    'legal',
    'scientific',
    'journalistic',
    'logical',
    'intelligence',
  ];

  const handleFrameworkSelect = (framework: ChallengeFramework) => {
    setSelectedFramework(framework);
    setStep('criteria');
  };

  const handleCriteriaSubmit = () => {
    if (checkedCriteria.size === 0) {
      alert('Please select at least one criterion');
      return;
    }
    setStep('challenge');
  };

  const handleChallengeSubmit = () => {
    if (!title.trim() || !rationale.trim()) {
      alert('Please fill in both fields');
      return;
    }
    onSubmit(
      title,
      rationale,
      selectedFramework || undefined,
      Array.from(checkedCriteria)
    );
  };

  const toggleCriterion = (criterion: string) => {
    const newChecked = new Set(checkedCriteria);
    if (newChecked.has(criterion)) {
      newChecked.delete(criterion);
    } else {
      newChecked.add(criterion);
    }
    setCheckedCriteria(newChecked);
  };

  const handleBack = () => {
    if (step === 'criteria') {
      setStep('framework');
    } else if (step === 'challenge') {
      setStep('criteria');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className="bg-black border border-crt-border p-6 max-w-3xl w-full mx-4 font-mono max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-crt-fg">CREATE CHALLENGE</h2>

        <div className="mb-6 p-4 bg-black border border-crt-border">
          <p className="text-sm text-crt-muted mb-2">CLAIM BEING CHALLENGED:</p>
          <p className="text-crt-fg italic">{claimText}</p>
        </div>

        {/* Step 1: Framework Selection */}
        {step === 'framework' && (
          <div className="space-y-4 mb-6">
            <p className="text-sm font-bold text-crt-fg">STEP 1: SELECT CHALLENGE FRAMEWORK</p>
            <div className="grid grid-cols-1 gap-3">
              {frameworks.map(framework => {
                const template = CHALLENGE_TEMPLATES[framework];
                return (
                  <button
                    key={framework}
                    onClick={() => handleFrameworkSelect(framework)}
                    className={`p-4 text-left border-2 transition-colors ${
                      selectedFramework === framework
                        ? 'border-crt-accent bg-crt-border'
                        : 'border-crt-border hover:border-crt-accent'
                    }`}
                  >
                    <div className="font-bold text-lg mb-1">
                      {template.icon} {template.label}
                    </div>
                    <p className="text-sm text-crt-muted">{template.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Criteria Selection */}
        {step === 'criteria' && selectedFramework && (
          <div className="space-y-4 mb-6">
            <p className="text-sm font-bold text-crt-fg">STEP 2: SELECT EVALUATION CRITERIA</p>
            <div className="mb-4 p-3 bg-crt-border">
              <p className="text-xs text-crt-muted mb-1">EVIDENCE STANDARDS:</p>
              <p className="text-sm text-crt-fg">
                {CHALLENGE_TEMPLATES[selectedFramework].evidenceStandards}
              </p>
            </div>
            <div className="space-y-2">
              {CHALLENGE_TEMPLATES[selectedFramework].criteria.map((criterion, idx) => (
                <label
                  key={idx}
                  className="flex items-start gap-3 cursor-pointer hover:bg-crt-border p-2"
                >
                  <input
                    type="checkbox"
                    checked={checkedCriteria.has(criterion)}
                    onChange={() => toggleCriterion(criterion)}
                    disabled={isLoading}
                    className="mt-1"
                  />
                  <span className="text-sm text-crt-fg">{criterion}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-crt-muted mt-2">
              Selected: {checkedCriteria.size} / {CHALLENGE_TEMPLATES[selectedFramework].criteria.length}
            </p>
          </div>
        )}

        {/* Step 3: Challenge Details */}
        {step === 'challenge' && selectedFramework && (
          <div className="space-y-4 mb-6">
            <p className="text-sm font-bold text-crt-fg">STEP 3: WRITE CHALLENGE</p>
            <div className="mb-3 p-3 bg-crt-border text-xs">
              <p className="text-crt-muted">Framework: {CHALLENGE_TEMPLATES[selectedFramework].label}</p>
              <p className="text-crt-muted mt-1">Criteria: {checkedCriteria.size} selected</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-crt-fg mb-2">Challenge Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., 'Questionable Statistical Claim'"
                className="w-full px-3 py-2 bg-black border border-crt-border text-crt-fg focus:outline-none focus:ring-2 focus:ring-crt-accent"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-crt-fg mb-2">Rationale</label>
              <textarea
                value={rationale}
                onChange={e => setRationale(e.target.value)}
                placeholder="Why are you challenging this claim? What concerns do you have?"
                rows={4}
                className="w-full px-3 py-2 bg-black border border-crt-border text-crt-fg focus:outline-none focus:ring-2 focus:ring-crt-accent"
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-6">
          {step !== 'framework' && (
            <button
              onClick={handleBack}
              disabled={isLoading}
              className="px-4 py-2 border border-crt-border text-crt-fg hover:bg-crt-border disabled:opacity-50 transition-colors"
            >
              Back
            </button>
          )}

          {step === 'framework' && (
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-crt-border text-crt-fg hover:bg-crt-border disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}

          {step === 'criteria' && (
            <>
              <button
                onClick={handleCriteriaSubmit}
                disabled={isLoading || checkedCriteria.size === 0}
                className="flex-1 px-4 py-2 bg-crt-accent text-black font-bold hover:bg-crt-fg disabled:opacity-50 transition-colors"
              >
                Next
              </button>
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 border border-crt-border text-crt-fg hover:bg-crt-border disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </>
          )}

          {step === 'challenge' && (
            <>
              <button
                onClick={handleChallengeSubmit}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-crt-accent text-black font-bold hover:bg-crt-fg disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Creating Challenge...' : 'Create Challenge'}
              </button>
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 border border-crt-border text-crt-fg hover:bg-crt-border disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
