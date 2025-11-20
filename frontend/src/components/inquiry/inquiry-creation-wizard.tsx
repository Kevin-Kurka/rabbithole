'use client';

import { useState, useEffect } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { theme, getCredibilityColor, getCredibilityStatus } from '@/styles/theme';

// GraphQL queries and mutations
const CHECK_INQUIRY_SIMILARITY = gql`
  query CheckInquirySimilarity($title: String!, $description: String!, $nodeId: String!, $inquiryType: String!) {
    checkInquirySimilarity(title: $title, description: $description, nodeId: $nodeId, inquiryType: $inquiryType) {
      existingInquiryId
      similarity
      title
      description
    }
  }
`;

const CREATE_INQUIRY = gql`
  mutation CreateInquiry($input: CreateInquiryInput!) {
    createInquiry(input: $input) {
      id
      title
      description
      inquiryType
      status
      createdAt
    }
  }
`;

// Inquiry types with descriptions
const INQUIRY_TYPES = [
  { code: 'factual_accuracy', name: 'Factual Accuracy', description: 'Verify if a claim is factually correct' },
  { code: 'logical_consistency', name: 'Logical Consistency', description: 'Check if reasoning is logically sound' },
  { code: 'source_credibility', name: 'Source Credibility', description: 'Evaluate reliability of information sources' },
  { code: 'bias_detection', name: 'Bias Detection', description: 'Identify potential biases in content' },
  { code: 'context_completeness', name: 'Context Completeness', description: 'Assess if full context is provided' },
  { code: 'evidence_quality', name: 'Evidence Quality', description: 'Evaluate strength of supporting evidence' },
  { code: 'temporal_relevance', name: 'Temporal Relevance', description: 'Check if information is still current' },
  { code: 'scope_appropriateness', name: 'Scope Appropriateness', description: 'Verify claim scope is appropriate' },
  { code: 'scientific_inquiry', name: 'Scientific Inquiry', description: 'Apply scientific method to claims' },
  { code: 'legal_discovery', name: 'Legal Discovery', description: 'Legal-standard evidence evaluation' },
  { code: 'ethical_evaluation', name: 'Ethical Evaluation', description: 'Assess ethical implications' },
  { code: 'statistical_validity', name: 'Statistical Validity', description: 'Verify statistical methodology' },
];

interface InquiryCreationWizardProps {
  nodeId: string;
  onComplete?: (inquiryId: string) => void;
  onCancel?: () => void;
}

export function InquiryCreationWizard({ nodeId, onComplete, onCancel }: InquiryCreationWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [initialStance, setInitialStance] = useState<'supporting' | 'opposing' | 'neutral'>('neutral');
  const [initialArgument, setInitialArgument] = useState('');
  const [similarInquiries, setSimilarInquiries] = useState<any[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [bypassDuplicateCheck, setBypassDuplicateCheck] = useState(false);
  const [duplicateJustification, setDuplicateJustification] = useState('');

  const [checkSimilarity, { loading: checkingSimiliarity }] = useLazyQuery(CHECK_INQUIRY_SIMILARITY);
  const [createInquiry, { loading: creating }] = useMutation(CREATE_INQUIRY);

  // Debounced similarity check
  useEffect(() => {
    if (step === 2 && title && description && selectedType) {
      const timer = setTimeout(async () => {
        try {
          const { data } = await checkSimilarity({
            variables: {
              title,
              description,
              nodeId,
              inquiryType: selectedType,
            },
          });

          if (data?.checkInquirySimilarity && data.checkInquirySimilarity.length > 0) {
            const highSimilarity = data.checkInquirySimilarity.filter((s: any) => s.similarity >= 0.85);
            if (highSimilarity.length > 0) {
              setSimilarInquiries(highSimilarity);
              setShowDuplicateModal(true);
            } else {
              setSimilarInquiries([]);
            }
          }
        } catch (error) {
          console.error('Error checking similarity:', error);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [title, description, selectedType, step, nodeId, checkSimilarity]);

  const handleCreateInquiry = async () => {
    try {
      const { data } = await createInquiry({
        variables: {
          input: {
            nodeId,
            inquiryType: selectedType,
            title,
            description,
            evidenceIds,
            initialPosition: initialArgument ? {
              stance: initialStance,
              argument: initialArgument,
            } : undefined,
            bypassDuplicateCheck,
            duplicateJustification: bypassDuplicateCheck ? duplicateJustification : undefined,
          },
        },
      });

      if (data?.createInquiry) {
        onComplete?.(data.createInquiry.id);
      }
    } catch (error: any) {
      console.error('Error creating inquiry:', error);
      alert(error.message || 'Failed to create inquiry');
    }
  };

  const handleBypassDuplicate = () => {
    if (duplicateJustification.length < 100) {
      alert('Justification must be at least 100 characters explaining why your inquiry is distinct');
      return;
    }
    setBypassDuplicateCheck(true);
    setShowDuplicateModal(false);
    handleCreateInquiry();
  };

  return (
    <div style={{
      backgroundColor: theme.colors.background.primary,
      borderRadius: theme.radius.lg,
      boxShadow: theme.shadow.lg,
      padding: theme.spacing[8],
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      {/* Progress indicator */}
      <div style={{ marginBottom: theme.spacing[8] }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing[4],
        }}>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: '4px',
                backgroundColor: s <= step ? theme.colors.primary[500] : theme.colors.neutral[200],
                marginRight: s < 4 ? theme.spacing[2] : 0,
                borderRadius: theme.radius.full,
                transition: `background-color ${theme.transition.base}`,
              }}
            />
          ))}
        </div>
        <div style={{
          fontSize: theme.fontSize.sm,
          color: theme.colors.text.secondary,
          textAlign: 'center',
        }}>
          Step {step} of 4
        </div>
      </div>

      {/* Step 1: Select inquiry type */}
      {step === 1 && (
        <div>
          <h2 style={{
            fontSize: theme.fontSize['2xl'],
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing[2],
          }}>
            Select Inquiry Type
          </h2>
          <p style={{
            fontSize: theme.fontSize.base,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing[6],
          }}>
            Choose the type of inquiry that best matches your investigation
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: theme.spacing[4],
          }}>
            {INQUIRY_TYPES.map((type) => (
              <button
                key={type.code}
                onClick={() => setSelectedType(type.code)}
                style={{
                  padding: theme.spacing[4],
                  border: `2px solid ${selectedType === type.code ? theme.colors.primary[500] : theme.colors.border.DEFAULT}`,
                  borderRadius: theme.radius.DEFAULT,
                  backgroundColor: selectedType === type.code ? theme.colors.primary[50] : theme.colors.background.primary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: `all ${theme.transition.base}`,
                }}
              >
                <div style={{
                  fontSize: theme.fontSize.base,
                  fontWeight: theme.fontWeight.semibold,
                  color: selectedType === type.code ? theme.colors.primary[700] : theme.colors.text.primary,
                  marginBottom: theme.spacing[2],
                }}>
                  {type.name}
                </div>
                <div style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.text.secondary,
                  lineHeight: theme.lineHeight.snug,
                }}>
                  {type.description}
                </div>
              </button>
            ))}
          </div>

          <div style={{
            marginTop: theme.spacing[8],
            display: 'flex',
            justifyContent: 'flex-end',
            gap: theme.spacing[4],
          }}>
            <button
              onClick={onCancel}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                border: `1px solid ${theme.colors.border.DEFAULT}`,
                borderRadius: theme.radius.DEFAULT,
                backgroundColor: theme.colors.background.primary,
                color: theme.colors.text.primary,
                fontSize: theme.fontSize.base,
                fontWeight: theme.fontWeight.medium,
                cursor: 'pointer',
                transition: `all ${theme.transition.base}`,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!selectedType}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                border: 'none',
                borderRadius: theme.radius.DEFAULT,
                backgroundColor: selectedType ? theme.colors.primary[500] : theme.colors.neutral[300],
                color: theme.colors.text.inverse,
                fontSize: theme.fontSize.base,
                fontWeight: theme.fontWeight.medium,
                cursor: selectedType ? 'pointer' : 'not-allowed',
                transition: `all ${theme.transition.base}`,
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Title and description */}
      {step === 2 && (
        <div>
          <h2 style={{
            fontSize: theme.fontSize['2xl'],
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing[2],
          }}>
            Describe Your Inquiry
          </h2>
          <p style={{
            fontSize: theme.fontSize.base,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing[6],
          }}>
            Provide a clear title and detailed description of what you want to investigate
          </p>

          <div style={{ marginBottom: theme.spacing[6] }}>
            <label style={{
              display: 'block',
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing[2],
            }}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a concise title for your inquiry"
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: `1px solid ${theme.colors.border.DEFAULT}`,
                borderRadius: theme.radius.DEFAULT,
                fontSize: theme.fontSize.base,
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.primary,
              }}
            />
          </div>

          <div style={{ marginBottom: theme.spacing[6] }}>
            <label style={{
              display: 'block',
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing[2],
            }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of your inquiry"
              rows={6}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: `1px solid ${theme.colors.border.DEFAULT}`,
                borderRadius: theme.radius.DEFAULT,
                fontSize: theme.fontSize.base,
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.primary,
                resize: 'vertical',
              }}
            />
          </div>

          {checkingSimiliarity && (
            <div style={{
              padding: theme.spacing[4],
              backgroundColor: theme.colors.info.bg,
              border: `1px solid ${theme.colors.info.border}`,
              borderRadius: theme.radius.DEFAULT,
              fontSize: theme.fontSize.sm,
              color: theme.colors.info.dark,
              marginBottom: theme.spacing[6],
            }}>
              Checking for similar inquiries...
            </div>
          )}

          <div style={{
            marginTop: theme.spacing[8],
            display: 'flex',
            justifyContent: 'space-between',
            gap: theme.spacing[4],
          }}>
            <button
              onClick={() => setStep(1)}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                border: `1px solid ${theme.colors.border.DEFAULT}`,
                borderRadius: theme.radius.DEFAULT,
                backgroundColor: theme.colors.background.primary,
                color: theme.colors.text.primary,
                fontSize: theme.fontSize.base,
                fontWeight: theme.fontWeight.medium,
                cursor: 'pointer',
                transition: `all ${theme.transition.base}`,
              }}
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!title || !description}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                border: 'none',
                borderRadius: theme.radius.DEFAULT,
                backgroundColor: title && description ? theme.colors.primary[500] : theme.colors.neutral[300],
                color: theme.colors.text.inverse,
                fontSize: theme.fontSize.base,
                fontWeight: theme.fontWeight.medium,
                cursor: title && description ? 'pointer' : 'not-allowed',
                transition: `all ${theme.transition.base}`,
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Evidence upload */}
      {step === 3 && (
        <div>
          <h2 style={{
            fontSize: theme.fontSize['2xl'],
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing[2],
          }}>
            Attach Evidence (Optional)
          </h2>
          <p style={{
            fontSize: theme.fontSize.base,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing[6],
          }}>
            Upload documents, images, or other evidence to support your inquiry
          </p>

          <div style={{
            border: `2px dashed ${theme.colors.border.DEFAULT}`,
            borderRadius: theme.radius.DEFAULT,
            padding: theme.spacing[8],
            textAlign: 'center',
            backgroundColor: theme.colors.background.secondary,
            marginBottom: theme.spacing[6],
          }}>
            <div style={{
              fontSize: theme.fontSize.base,
              color: theme.colors.text.secondary,
              marginBottom: theme.spacing[4],
            }}>
              Drag and drop files here or click to browse
            </div>
            <button
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                border: `1px solid ${theme.colors.border.DEFAULT}`,
                borderRadius: theme.radius.DEFAULT,
                backgroundColor: theme.colors.background.primary,
                color: theme.colors.text.primary,
                fontSize: theme.fontSize.base,
                fontWeight: theme.fontWeight.medium,
                cursor: 'pointer',
                transition: `all ${theme.transition.base}`,
              }}
            >
              Select Files
            </button>
          </div>

          <div style={{
            marginTop: theme.spacing[8],
            display: 'flex',
            justifyContent: 'space-between',
            gap: theme.spacing[4],
          }}>
            <button
              onClick={() => setStep(2)}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                border: `1px solid ${theme.colors.border.DEFAULT}`,
                borderRadius: theme.radius.DEFAULT,
                backgroundColor: theme.colors.background.primary,
                color: theme.colors.text.primary,
                fontSize: theme.fontSize.base,
                fontWeight: theme.fontWeight.medium,
                cursor: 'pointer',
                transition: `all ${theme.transition.base}`,
              }}
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                border: 'none',
                borderRadius: theme.radius.DEFAULT,
                backgroundColor: theme.colors.primary[500],
                color: theme.colors.text.inverse,
                fontSize: theme.fontSize.base,
                fontWeight: theme.fontWeight.medium,
                cursor: 'pointer',
                transition: `all ${theme.transition.base}`,
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Initial position */}
      {step === 4 && (
        <div>
          <h2 style={{
            fontSize: theme.fontSize['2xl'],
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing[2],
          }}>
            Create Initial Position (Optional)
          </h2>
          <p style={{
            fontSize: theme.fontSize.base,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing[6],
          }}>
            Start the discussion by providing your initial position on this inquiry
          </p>

          <div style={{ marginBottom: theme.spacing[6] }}>
            <label style={{
              display: 'block',
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing[2],
            }}>
              Stance
            </label>
            <div style={{ display: 'flex', gap: theme.spacing[4] }}>
              {['supporting', 'opposing', 'neutral'].map((stance) => (
                <button
                  key={stance}
                  onClick={() => setInitialStance(stance as any)}
                  style={{
                    flex: 1,
                    padding: theme.spacing[3],
                    border: `2px solid ${initialStance === stance ? theme.colors.primary[500] : theme.colors.border.DEFAULT}`,
                    borderRadius: theme.radius.DEFAULT,
                    backgroundColor: initialStance === stance ? theme.colors.primary[50] : theme.colors.background.primary,
                    color: initialStance === stance ? theme.colors.primary[700] : theme.colors.text.primary,
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.medium,
                    cursor: 'pointer',
                    transition: `all ${theme.transition.base}`,
                    textTransform: 'capitalize',
                  }}
                >
                  {stance}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: theme.spacing[6] }}>
            <label style={{
              display: 'block',
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing[2],
            }}>
              Argument
            </label>
            <textarea
              value={initialArgument}
              onChange={(e) => setInitialArgument(e.target.value)}
              placeholder="Explain your position with supporting arguments"
              rows={6}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: `1px solid ${theme.colors.border.DEFAULT}`,
                borderRadius: theme.radius.DEFAULT,
                fontSize: theme.fontSize.base,
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.primary,
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{
            marginTop: theme.spacing[8],
            display: 'flex',
            justifyContent: 'space-between',
            gap: theme.spacing[4],
          }}>
            <button
              onClick={() => setStep(3)}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                border: `1px solid ${theme.colors.border.DEFAULT}`,
                borderRadius: theme.radius.DEFAULT,
                backgroundColor: theme.colors.background.primary,
                color: theme.colors.text.primary,
                fontSize: theme.fontSize.base,
                fontWeight: theme.fontWeight.medium,
                cursor: 'pointer',
                transition: `all ${theme.transition.base}`,
              }}
            >
              Back
            </button>
            <button
              onClick={handleCreateInquiry}
              disabled={creating}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                border: 'none',
                borderRadius: theme.radius.DEFAULT,
                backgroundColor: creating ? theme.colors.neutral[300] : theme.colors.primary[500],
                color: theme.colors.text.inverse,
                fontSize: theme.fontSize.base,
                fontWeight: theme.fontWeight.medium,
                cursor: creating ? 'not-allowed' : 'pointer',
                transition: `all ${theme.transition.base}`,
              }}
            >
              {creating ? 'Creating...' : 'Create Inquiry'}
            </button>
          </div>
        </div>
      )}

      {/* Duplicate detection modal */}
      {showDuplicateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.background.overlay,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: theme.zIndex.modal,
        }}>
          <div style={{
            backgroundColor: theme.colors.background.primary,
            borderRadius: theme.radius.lg,
            boxShadow: theme.shadow.xl,
            padding: theme.spacing[8],
            maxWidth: '600px',
            width: '90%',
          }}>
            <h3 style={{
              fontSize: theme.fontSize.xl,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing[4],
            }}>
              Similar Inquiry Found
            </h3>

            <p style={{
              fontSize: theme.fontSize.base,
              color: theme.colors.text.secondary,
              marginBottom: theme.spacing[6],
            }}>
              We found an existing inquiry that is very similar to yours:
            </p>

            {similarInquiries.map((similar) => (
              <div
                key={similar.existingInquiryId}
                style={{
                  padding: theme.spacing[4],
                  border: `1px solid ${theme.colors.border.DEFAULT}`,
                  borderRadius: theme.radius.DEFAULT,
                  marginBottom: theme.spacing[4],
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: theme.spacing[2],
                }}>
                  <div style={{
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.semibold,
                    color: theme.colors.text.primary,
                  }}>
                    {(similar.similarity * 100).toFixed(0)}% match
                  </div>
                </div>
                <div style={{
                  fontSize: theme.fontSize.base,
                  fontWeight: theme.fontWeight.medium,
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing[2],
                }}>
                  {similar.title}
                </div>
                <div style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.text.secondary,
                }}>
                  {similar.description}
                </div>
              </div>
            ))}

            <div style={{ marginBottom: theme.spacing[6] }}>
              <label style={{
                display: 'block',
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
                color: theme.colors.text.primary,
                marginBottom: theme.spacing[2],
              }}>
                Why is your inquiry distinct? (min 100 characters)
              </label>
              <textarea
                value={duplicateJustification}
                onChange={(e) => setDuplicateJustification(e.target.value)}
                placeholder="Explain how your inquiry differs from the existing one"
                rows={4}
                style={{
                  width: '100%',
                  padding: theme.spacing[3],
                  border: `1px solid ${theme.colors.border.DEFAULT}`,
                  borderRadius: theme.radius.DEFAULT,
                  fontSize: theme.fontSize.base,
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.background.primary,
                  resize: 'vertical',
                }}
              />
              <div style={{
                fontSize: theme.fontSize.xs,
                color: theme.colors.text.tertiary,
                marginTop: theme.spacing[2],
              }}>
                {duplicateJustification.length}/100 characters
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: theme.spacing[4],
            }}>
              <button
                onClick={() => {
                  setShowDuplicateModal(false);
                  setSimilarInquiries([]);
                }}
                style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                  border: `1px solid ${theme.colors.border.DEFAULT}`,
                  borderRadius: theme.radius.DEFAULT,
                  backgroundColor: theme.colors.background.primary,
                  color: theme.colors.text.primary,
                  fontSize: theme.fontSize.base,
                  fontWeight: theme.fontWeight.medium,
                  cursor: 'pointer',
                  transition: `all ${theme.transition.base}`,
                }}
              >
                View Existing Inquiry
              </button>
              <button
                onClick={handleBypassDuplicate}
                disabled={duplicateJustification.length < 100}
                style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                  border: 'none',
                  borderRadius: theme.radius.DEFAULT,
                  backgroundColor: duplicateJustification.length >= 100 ? theme.colors.primary[500] : theme.colors.neutral[300],
                  color: theme.colors.text.inverse,
                  fontSize: theme.fontSize.base,
                  fontWeight: theme.fontWeight.medium,
                  cursor: duplicateJustification.length >= 100 ? 'pointer' : 'not-allowed',
                  transition: `all ${theme.transition.base}`,
                }}
              >
                Create Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
