import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EvidenceCard } from '../components/evidence-card';
import { EvidenceComparison } from '../components/evidence-comparison';
import { VoteWidget } from '../components/vote-widget';
import { StatusBadge } from '../components/status-badge';
import { CHALLENGE_TEMPLATES } from '../lib/challenge-templates';
import {
  getNode,
  traverse,
  createNode,
  createEdge,
  submitVote,
  requestAIAnalysis,
  getUserVote,
} from '../lib/api';
import type { SentientNode, Evidence, ChallengeFramework } from '../lib/types';

interface EvidenceForm {
  title: string;
  body: string;
  source_url?: string;
  source_type: 'primary_source' | 'document' | 'data' | 'testimony' | 'expert_opinion' | 'media' | 'academic';
}

export function ChallengePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<SentientNode<any> | null>(null);
  const [targetClaim, setTargetClaim] = useState<SentientNode<any> | null>(null);
  const [supportingEvidence, setSupportingEvidence] = useState<SentientNode<any>[]>([]);
  const [refutingEvidence, setRefutingEvidence] = useState<SentientNode<any>[]>([]);
  const [userVote, setUserVote] = useState<'for' | 'against' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEvidenceForm, setShowEvidenceForm] = useState<'for' | 'against' | null>(null);
  const [evidenceForm, setEvidenceForm] = useState<EvidenceForm>({
    title: '',
    body: '',
    source_url: '',
    source_type: 'document',
  });
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const [votingLoading, setVotingLoading] = useState(false);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonEvidenceA, setComparisonEvidenceA] = useState<Evidence | null>(null);
  const [comparisonEvidenceB, setComparisonEvidenceB] = useState<Evidence | null>(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        // Fetch the challenge node
        const challengeNode = await getNode(id);
        setChallenge(challengeNode);

        // Traverse to find connected evidence and claims
        const traversed = await traverse(id, 2);

        // Extract evidence nodes (filter by type field, not node_type)
        const evidence = traversed.filter((n: any) => n.type === 'EVIDENCE');
        const supporting = evidence.filter((e: any) => e.properties.side === 'for');
        const refuting = evidence.filter((e: any) => e.properties.side === 'against');

        setSupportingEvidence(supporting);
        setRefutingEvidence(refuting);

        // Extract target claim
        const claim = traversed.find((n: any) => n.type === 'CLAIM');
        if (claim) {
          setTargetClaim(claim);
        }

        // Get user's vote
        const vote = await getUserVote(id, ''); // TODO: Get actual user ID
        setUserVote(vote);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load challenge');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleVote = async (side: 'for' | 'against') => {
    if (!id) return;

    setVotingLoading(true);
    try {
      await submitVote(id, '', side); // TODO: Get actual user ID
      setUserVote(side);

      const newScore = challenge ? (challenge.properties as any).community_score + (side === 'for' ? 1 : -1) : 0;
      if (challenge) {
        (challenge.properties as any).community_score = newScore;
        setChallenge({ ...challenge });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to vote');
    } finally {
      setVotingLoading(false);
    }
  };

  const handleSubmitEvidence = async (side: 'for' | 'against') => {
    if (!id || !evidenceForm.title || !evidenceForm.body) {
      setError('Title and body are required');
      return;
    }

    setSubmittingEvidence(true);
    try {
      const evidence = await createNode('EVIDENCE', {
        title: evidenceForm.title,
        body: evidenceForm.body,
        source_url: evidenceForm.source_url,
        source_type: evidenceForm.source_type,
        side,
        relevance_score: 50,
        credibility_score: 50,
        status: 'unchallenged',
      });

      await createEdge(id, evidence.id, side === 'for' ? 'SUPPORTS' : 'REFUTES');

      if (side === 'for') {
        setSupportingEvidence([...supportingEvidence, evidence]);
      } else {
        setRefutingEvidence([...refutingEvidence, evidence]);
      }

      setEvidenceForm({ title: '', body: '', source_url: '', source_type: 'document' });
      setShowEvidenceForm(null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit evidence');
    } finally {
      setSubmittingEvidence(false);
    }
  };

  const handleRequestAIAnalysis = async () => {
    if (!id) return;

    setAnalyzingAI(true);
    try {
      const allEvidence = [...supportingEvidence, ...refutingEvidence];
      const summary = allEvidence
        .map(e => `${e.properties.side === 'for' ? 'Supporting' : 'Refuting'}: ${e.properties.title}`)
        .join('\n');

      const result = await requestAIAnalysis(id, summary);

      if (challenge) {
        challenge.properties.ai_score = result.ai_score;
        challenge.properties.ai_analysis = result.ai_analysis;
        setChallenge({ ...challenge });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze evidence');
    } finally {
      setAnalyzingAI(false);
    }
  };

  const handleChallengeEvidence = (evidenceId: string) => {
    navigate(`/challenge/${evidenceId}`);
  };

  if (loading) {
    return (<div className="max-w-6xl mx-auto font-mono">
        <div className="text-center py-12">
          <p className="text-crt-dim">Loading challenge...</p>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (<div className="max-w-6xl mx-auto font-mono">
        <div className="text-center py-12">
          <p className="text-crt-error">{error || 'Challenge not found'}</p>
        </div>
      </div>
    );
  }

  const allEvidence = [...supportingEvidence, ...refutingEvidence];
  const canRequestAI = allEvidence.length >= 3 && !(challenge.properties as any).ai_score;

  const challengeProps = challenge.properties as any;
  const framework = challengeProps.framework as ChallengeFramework | undefined;
  const template = framework ? CHALLENGE_TEMPLATES[framework] : null;
  const checkedCriteria = challengeProps.checked_criteria as string[] | undefined;

  return (<div className="max-w-6xl mx-auto font-mono">
      {/* Header */}
      <div className="bg-black  border border-crt-border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{challengeProps.title}</h1>
              {framework && (
                <span className="px-3 py-1 bg-crt-border border border-crt-accent text-sm font-bold">
                  [{template?.icon} {framework.toUpperCase()}]
                </span>
              )}
            </div>
            {targetClaim && (
              <p className="text-crt-fg mb-2">
                <span className="font-medium">Claim:</span> {(targetClaim.properties as any).text}
              </p>
            )}
            <div className="flex items-center gap-3">
              <StatusBadge status={challengeProps.status} type="challenge" />
              <StatusBadge status={challengeProps.verdict} type="verdict" />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <VoteWidget
            communityScore={challengeProps.community_score}
            userVote={userVote}
            onVote={handleVote}
            loading={votingLoading}
          />
        </div>
      </div>

      {/* Framework Context Section */}
      {template && (
        <div className="bg-black border border-crt-border p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 text-crt-fg">FRAMEWORK CONTEXT</h2>

          {/* Evidence Standards */}
          <div className="mb-4 p-3 bg-crt-border">
            <p className="text-xs text-crt-muted mb-1">EVIDENCE STANDARDS ({template.label}):</p>
            <p className="text-sm text-crt-fg">{template.evidenceStandards}</p>
          </div>

          {/* Evaluation Criteria */}
          <div>
            <p className="text-sm font-bold text-crt-fg mb-2">EVALUATION CRITERIA:</p>
            <div className="space-y-2">
              {template.criteria.map((criterion, idx) => {
                const isChecked = checkedCriteria?.includes(criterion);
                return (
                  <div
                    key={idx}
                    className={`p-2 border border-crt-border ${
                      isChecked ? 'bg-crt-border' : ''
                    }`}
                  >
                    <span className={isChecked ? 'font-bold' : 'font-normal'}>
                      {isChecked ? '✓ ' : '• '}
                      {criterion}
                    </span>
                  </div>
                );
              })}
            </div>
            {checkedCriteria && (
              <p className="text-xs text-crt-muted mt-2">
                {checkedCriteria.length} / {template.criteria.length} criteria selected
              </p>
            )}
          </div>

          {/* Verdict Scale */}
          <div className="mt-4">
            <p className="text-sm font-bold text-crt-fg mb-2">VERDICT SCALE:</p>
            <div className="space-y-2">
              {template.verdictScale.map((scale, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs"
                >
                  <div
                    className="w-3 h-3 mt-1 border border-crt-border"
                    style={{ backgroundColor: scale.color }}
                  />
                  <div>
                    <p className="font-bold">{scale.label}</p>
                    <p className="text-crt-muted">{scale.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-black border border-red-200  text-crt-error">
          {error}
        </div>
      )}

      {/* Compare Evidence Button */}
      {supportingEvidence.length >= 2 || refutingEvidence.length >= 2 ? (
        <div className="mb-6 p-4 bg-black border border-crt-border flex items-center justify-between">
          <span className="text-crt-fg font-medium">Compare two evidence items side-by-side</span>
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="px-4 py-2 bg-crt-selection text-white font-medium hover:bg-crt-border transition-colors font-mono"
          >
            {showComparison ? 'HIDE COMPARISON' : '[ COMPARE EVIDENCE ]'}
          </button>
        </div>
      ) : null}

      {/* Evidence Comparison View */}
      {showComparison && (
        <div className="mb-6 p-4 bg-black border border-crt-border">
          <h2 className="text-xl font-bold mb-4 text-crt-fg">SELECT EVIDENCE TO COMPARE</h2>

          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm font-medium text-crt-fg mb-2">EVIDENCE A:</label>
              <select
                value={comparisonEvidenceA?.id || ''}
                onChange={(e) => {
                  const selected = [...supportingEvidence, ...refutingEvidence].find(
                    (ev) => ev.id === e.target.value
                  );
                  setComparisonEvidenceA(selected as Evidence || null);
                }}
                className="w-full px-3 py-2 bg-black border border-crt-border text-crt-fg focus:outline-none focus:ring-2 focus:ring-crt-fg text-sm font-mono"
              >
                <option value="">-- Select evidence --</option>
                {[...supportingEvidence, ...refutingEvidence].map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {(ev.properties as any).title.substring(0, 40)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-crt-fg mb-2">EVIDENCE B:</label>
              <select
                value={comparisonEvidenceB?.id || ''}
                onChange={(e) => {
                  const selected = [...supportingEvidence, ...refutingEvidence].find(
                    (ev) => ev.id === e.target.value
                  );
                  setComparisonEvidenceB(selected as Evidence || null);
                }}
                className="w-full px-3 py-2 bg-black border border-crt-border text-crt-fg focus:outline-none focus:ring-2 focus:ring-crt-fg text-sm font-mono"
              >
                <option value="">-- Select evidence --</option>
                {[...supportingEvidence, ...refutingEvidence].map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {(ev.properties as any).title.substring(0, 40)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {comparisonEvidenceA && comparisonEvidenceB && (
            <div className="mt-6 border-t border-crt-border pt-6">
              <EvidenceComparison
                evidenceA={comparisonEvidenceA}
                evidenceB={comparisonEvidenceB}
              />
            </div>
          )}
        </div>
      )}

      {/* Evidence columns */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Supporting evidence */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-crt-fg">Supporting Evidence ({supportingEvidence.length})</h2>
          <div className="space-y-4 min-h-96">
            {supportingEvidence.map(evidence => (
              <EvidenceCard
                key={evidence.id}
                evidence={evidence}
                onChallenge={handleChallengeEvidence}
              />
            ))}

            {showEvidenceForm === 'for' && (
              <div className="bg-green-50 border border-green-300  p-4">
                <h3 className="font-semibold mb-3">Submit Supporting Evidence</h3>
                <input
                  type="text"
                  placeholder="Evidence title"
                  value={evidenceForm.title}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-crt-border  mb-2 focus:outline-none focus:ring-2 focus:ring-crt-fg text-sm"
                />
                <textarea
                  placeholder="Evidence description"
                  value={evidenceForm.body}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, body: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-crt-border  mb-2 focus:outline-none focus:ring-2 focus:ring-crt-fg text-sm"
                />
                <input
                  type="url"
                  placeholder="Source URL (optional)"
                  value={evidenceForm.source_url || ''}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, source_url: e.target.value })}
                  className="w-full px-3 py-2 border border-crt-border  mb-2 focus:outline-none focus:ring-2 focus:ring-crt-fg text-sm"
                />
                <select
                  value={evidenceForm.source_type}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, source_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-crt-border  mb-3 focus:outline-none focus:ring-2 focus:ring-crt-fg text-sm"
                >
                  <option value="primary_source">Primary Source</option>
                  <option value="document">Document</option>
                  <option value="data">Data</option>
                  <option value="testimony">Testimony</option>
                  <option value="expert_opinion">Expert Opinion</option>
                  <option value="media">Media</option>
                  <option value="academic">Academic</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSubmitEvidence('for')}
                    disabled={submittingEvidence}
                    className="flex-1 px-3 py-2 bg-green-600 text-white  text-sm hover:bg-green-700 disabled:bg-gray-400 font-medium transition-colors"
                  >
                    Submit
                  </button>
                  <button
                    onClick={() => setShowEvidenceForm(null)}
                    className="flex-1 px-3 py-2 border border-crt-border  text-sm hover:bg-black font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showEvidenceForm !== 'for' && (
              <button
                onClick={() => setShowEvidenceForm('for')}
                className="w-full px-4 py-2 border-2 border-dashed border-crt-border  text-crt-muted hover:border-crt-fg hover:text-green-600 font-medium transition-colors"
              >
                + Add Supporting Evidence
              </button>
            )}
          </div>
        </div>

        {/* Refuting evidence */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-crt-error">Refuting Evidence ({refutingEvidence.length})</h2>
          <div className="space-y-4 min-h-96">
            {refutingEvidence.map(evidence => (
              <EvidenceCard
                key={evidence.id}
                evidence={evidence}
                onChallenge={handleChallengeEvidence}
              />
            ))}

            {showEvidenceForm === 'against' && (
              <div className="bg-black border border-red-300  p-4">
                <h3 className="font-semibold mb-3">Submit Refuting Evidence</h3>
                <input
                  type="text"
                  placeholder="Evidence title"
                  value={evidenceForm.title}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-crt-border  mb-2 focus:outline-none focus:ring-2 focus:ring-crt-fg text-sm"
                />
                <textarea
                  placeholder="Evidence description"
                  value={evidenceForm.body}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, body: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-crt-border  mb-2 focus:outline-none focus:ring-2 focus:ring-crt-fg text-sm"
                />
                <input
                  type="url"
                  placeholder="Source URL (optional)"
                  value={evidenceForm.source_url || ''}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, source_url: e.target.value })}
                  className="w-full px-3 py-2 border border-crt-border  mb-2 focus:outline-none focus:ring-2 focus:ring-crt-fg text-sm"
                />
                <select
                  value={evidenceForm.source_type}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, source_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-crt-border  mb-3 focus:outline-none focus:ring-2 focus:ring-crt-fg text-sm"
                >
                  <option value="primary_source">Primary Source</option>
                  <option value="document">Document</option>
                  <option value="data">Data</option>
                  <option value="testimony">Testimony</option>
                  <option value="expert_opinion">Expert Opinion</option>
                  <option value="media">Media</option>
                  <option value="academic">Academic</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSubmitEvidence('against')}
                    disabled={submittingEvidence}
                    className="flex-1 px-3 py-2 bg-red-600 text-white  text-sm hover:bg-red-700 disabled:bg-gray-400 font-medium transition-colors"
                  >
                    Submit
                  </button>
                  <button
                    onClick={() => setShowEvidenceForm(null)}
                    className="flex-1 px-3 py-2 border border-crt-border  text-sm hover:bg-black font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showEvidenceForm !== 'against' && (
              <button
                onClick={() => setShowEvidenceForm('against')}
                className="w-full px-4 py-2 border-2 border-dashed border-crt-border  text-crt-muted hover:border-crt-error hover:text-crt-error font-medium transition-colors"
              >
                + Add Refuting Evidence
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="bg-black  border border-crt-border p-6">
        <h2 className="text-xl font-bold mb-4">AI Analysis</h2>

        {(challenge.properties as any).ai_score ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Score</span>
              <span className="text-2xl font-bold text-crt-fg">{(challenge.properties as any).ai_score}/100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Verdict</span>
              <StatusBadge
                status={
                  (challenge.properties as any).ai_score > 70
                    ? 'verified'
                    : (challenge.properties as any).ai_score < 30
                    ? 'debunked'
                    : 'contested'
                }
              />
            </div>
            <div className="bg-black  p-3">
              <p className="text-sm text-crt-fg">{(challenge.properties as any).ai_analysis}</p>
            </div>
          </div>
        ) : canRequestAI ? (
          <div className="text-center">
            <p className="text-crt-muted mb-4">
              {allEvidence.length} pieces of evidence submitted. AI analysis is ready.
            </p>
            <button
              onClick={handleRequestAIAnalysis}
              disabled={analyzingAI}
              className="px-6 py-2 bg-crt-selection text-white  hover:bg-crt-border disabled:bg-gray-400 font-medium transition-colors"
            >
              {analyzingAI ? 'Analyzing...' : 'Request AI Analysis'}
            </button>
          </div>
        ) : (
          <p className="text-crt-muted">
            Submit at least 3 pieces of evidence to trigger AI analysis.
          </p>
        )}
      </div>
    </div>
  );
}
