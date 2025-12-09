'use client';

import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { theme } from '@/styles/theme';

const CAST_VOTE = gql`
  mutation CastVote($input: CastVoteInput!) {
    castVote(input: $input) {
      id
      voteCount
      credibilityScore
    }
  }
`;

interface AdjudicationPanelProps {
    inquiry: {
        id: string;
        title: string;
        description: string; // The "Warrant"
        logicType?: string; // The "Charge"
        highlightedText?: string; // The "Subject"
        credibilityScore: number;
    };
}

export function AdjudicationPanel({ inquiry }: AdjudicationPanelProps) {
    const [step, setStep] = useState(1);
    const [castVote, { loading }] = useMutation(CAST_VOTE);

    const handleVote = async (isValid: boolean) => {
        try {
            await castVote({
                variables: {
                    input: {
                        targetNodeId: inquiry.id,
                        voteType: isValid ? 'VALID' : 'INVALID',
                    },
                },
            });
            alert('Vote cast successfully!');
        } catch (error) {
            console.error('Error casting vote:', error);
        }
    };

    const steps = [
        { title: 'Subject', content: inquiry.highlightedText || 'No subject text available.' },
        { title: 'Charge', content: inquiry.logicType || 'No logic type assigned.' },
        { title: 'Warrant', content: inquiry.description },
        { title: 'Logic Test', content: 'Does the subject text exhibit the specific logical error defined by the charge?' }, // TODO: Fetch specific test based on logicType
        { title: 'Vote', content: 'Is the charge valid?' },
    ];

    return (
        <div style={{
            backgroundColor: theme.colors.background.primary,
            borderRadius: theme.radius.lg,
            boxShadow: theme.shadow.lg,
            padding: theme.spacing[6],
            maxWidth: '600px',
        }}>
            <h2 style={{ fontSize: theme.fontSize.xl, fontWeight: 'bold', marginBottom: theme.spacing[4] }}>
                Adjudication Protocol
            </h2>

            <div style={{ marginBottom: theme.spacing[6] }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: theme.spacing[2] }}>
                    {steps.map((s, i) => (
                        <div key={i} style={{
                            fontWeight: step === i + 1 ? 'bold' : 'normal',
                            color: step === i + 1 ? theme.colors.primary[500] : theme.colors.text.secondary,
                            cursor: 'pointer'
                        }} onClick={() => setStep(i + 1)}>
                            {i + 1}. {s.title}
                        </div>
                    ))}
                </div>
                <div style={{ height: '2px', backgroundColor: theme.colors.neutral[200] }}>
                    <div style={{
                        width: `${(step / 5) * 100}%`,
                        height: '100%',
                        backgroundColor: theme.colors.primary[500],
                        transition: 'width 0.3s'
                    }} />
                </div>
            </div>

            <div style={{ minHeight: '150px', marginBottom: theme.spacing[6] }}>
                <h3 style={{ fontSize: theme.fontSize.lg, fontWeight: 'semibold', marginBottom: theme.spacing[2] }}>
                    {steps[step - 1].title}
                </h3>
                <p style={{ fontSize: theme.fontSize.base, color: theme.colors.text.primary }}>
                    {steps[step - 1].content}
                </p>

                {step === 5 && (
                    <div style={{ display: 'flex', gap: theme.spacing[4], marginTop: theme.spacing[4] }}>
                        <button
                            onClick={() => handleVote(true)}
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: theme.spacing[3],
                                backgroundColor: theme.colors.success.bg,
                                color: theme.colors.success.dark,
                                border: `1px solid ${theme.colors.success.border}`,
                                borderRadius: theme.radius.DEFAULT,
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            VALID
                        </button>
                        <button
                            onClick={() => handleVote(false)}
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: theme.spacing[3],
                                backgroundColor: theme.colors.error.bg,
                                color: theme.colors.error.dark,
                                border: `1px solid ${theme.colors.error.border}`,
                                borderRadius: theme.radius.DEFAULT,
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            INVALID
                        </button>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                    onClick={() => setStep(Math.max(1, step - 1))}
                    disabled={step === 1}
                    style={{ padding: theme.spacing[2], cursor: step === 1 ? 'not-allowed' : 'pointer' }}
                >
                    Previous
                </button>
                <button
                    onClick={() => setStep(Math.min(5, step + 1))}
                    disabled={step === 5}
                    style={{ padding: theme.spacing[2], cursor: step === 5 ? 'not-allowed' : 'pointer' }}
                >
                    Next
                </button>
            </div>
        </div>
    );
}
