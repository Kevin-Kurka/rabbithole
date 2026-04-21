import type { ChallengeTemplate, ChallengeFramework } from './types';

export const CHALLENGE_TEMPLATES: Record<ChallengeFramework, ChallengeTemplate> = {
  legal: {
    framework: 'legal',
    label: 'Legal Framework',
    icon: '⚖️',
    description: 'Evaluate claims using legal standards: burden of proof, admissibility, chain of custody, expert qualification.',
    criteria: [
      'What facts are contested?',
      'What is the burden of proof?',
      'Is the evidence admissible?',
      'Is there chain of custody?',
      'Are expert witnesses qualified?',
      'Does evidence satisfy hearsay exceptions?',
    ],
    evidenceStandards: 'Admissible, authentic, relevant, probative. Chain of custody documented.',
    verdictScale: [
      {
        level: 'beyond_reasonable_doubt',
        label: 'Proven Beyond Reasonable Doubt',
        description: 'Evidence is conclusive and compelling',
        color: '#00d900',
      },
      {
        level: 'clear_and_convincing',
        label: 'Clear and Convincing',
        description: 'Evidence strongly supports the claim',
        color: '#00a600',
      },
      {
        level: 'preponderance',
        label: 'Preponderance of Evidence',
        description: 'Evidence slightly favors the claim',
        color: '#e5e500',
      },
      {
        level: 'probable_cause',
        label: 'Probable Cause Only',
        description: 'Sufficient for investigation but not proof',
        color: '#e5a500',
      },
      {
        level: 'insufficient',
        label: 'Insufficient Evidence',
        description: 'Evidence does not support the claim',
        color: '#e50000',
      },
    ],
  },

  scientific: {
    framework: 'scientific',
    label: 'Scientific Framework',
    icon: '🔬',
    description: 'Evaluate claims using scientific standards: falsifiability, control groups, sample size, replicability, pre-registration.',
    criteria: [
      'Is the hypothesis falsifiable?',
      'Was there a control group?',
      'What is the sample size?',
      'Can results be replicated?',
      'Is correlation claimed as causation?',
      'Was the hypothesis pre-registered?',
    ],
    evidenceStandards: 'Peer-reviewed, replicated, adequate sample size, pre-registered hypothesis.',
    verdictScale: [
      {
        level: 'confirmed',
        label: 'Confirmed (meta-analyses)',
        description: 'Strong consensus from multiple studies',
        color: '#00d900',
      },
      {
        level: 'well_supported',
        label: 'Well-Supported (replicated)',
        description: 'Results consistently replicated',
        color: '#00a600',
      },
      {
        level: 'provisional',
        label: 'Provisionally Supported',
        description: 'Evidence exists but needs more research',
        color: '#e5e500',
      },
      {
        level: 'questionable',
        label: 'Questionable (design issues)',
        description: 'Significant methodological concerns',
        color: '#e5a500',
      },
      {
        level: 'falsified',
        label: 'Falsified',
        description: 'Evidence contradicts the claim',
        color: '#e50000',
      },
    ],
  },

  journalistic: {
    framework: 'journalistic',
    label: 'Journalistic Framework',
    icon: '📰',
    description: 'Evaluate claims using journalistic standards: primary vs secondary sources, on-the-record attribution, independent verification, documents, bias assessment.',
    criteria: [
      'Is it from a primary or secondary source?',
      'Is the source on-the-record?',
      'How many independent sources confirm?',
      'Do documents corroborate?',
      'What is the source\'s potential bias?',
      'Is the source authoritative on this topic?',
    ],
    evidenceStandards: 'Primary source + documents, or two independent on-record sources minimum.',
    verdictScale: [
      {
        level: 'gold_standard',
        label: 'Gold Standard (docs + on-record)',
        description: 'Primary documents plus on-record confirmation',
        color: '#00d900',
      },
      {
        level: 'strongly_verified',
        label: 'Strongly Verified',
        description: 'Multiple independent on-record sources',
        color: '#00a600',
      },
      {
        level: 'publishable',
        label: 'Publishable with Caveats',
        description: 'Sufficient for publication with attribution',
        color: '#e5e500',
      },
      {
        level: 'needs_context',
        label: 'Needs More Context',
        description: 'Requires additional reporting',
        color: '#e5a500',
      },
      {
        level: 'not_publishable',
        label: 'Not Publishable',
        description: 'Insufficient source quality',
        color: '#e50000',
      },
    ],
  },

  logical: {
    framework: 'logical',
    label: 'Logical Framework',
    icon: '🧠',
    description: 'Evaluate claims using logical analysis: true premises, valid reasoning, absence of fallacies, relevance, sufficiency.',
    criteria: [
      'Are the premises true?',
      'Is the logic valid (no fallacy)?',
      'Does it address the actual claim?',
      'Are there straw man arguments?',
      'Is there appeal to authority outside expertise?',
      'Is there circular reasoning?',
    ],
    evidenceStandards: 'Premises must be true, relevant, sufficient. No logical fallacies.',
    verdictScale: [
      {
        level: 'compelling',
        label: 'Logically Compelling',
        description: 'Sound premises with valid deductive reasoning',
        color: '#00d900',
      },
      {
        level: 'sound',
        label: 'Logically Sound',
        description: 'Valid reasoning with true premises',
        color: '#00a600',
      },
      {
        level: 'weak',
        label: 'Logically Weak',
        description: 'Valid reasoning but insufficient premises',
        color: '#e5a500',
      },
      {
        level: 'invalid',
        label: 'Logically Invalid (major fallacy)',
        description: 'Contains fundamental logical errors',
        color: '#e50000',
      },
    ],
  },

  intelligence: {
    framework: 'intelligence',
    label: 'Intelligence Framework',
    icon: '🎯',
    description: 'Evaluate claims using intelligence analysis: source reliability, information credibility, competitive hypotheses, diagnostic evidence, confirmation bias assessment.',
    criteria: [
      'What is the source reliability (A-F)?',
      'What is the information credibility (1-6)?',
      'Have competing hypotheses been considered?',
      'Is there diagnostic (not just consistent) evidence?',
      'Is there confirmation bias?',
      'What would disprove this?',
    ],
    evidenceStandards: 'Source assessed for reliability AND credibility. ACH analysis preferred.',
    verdictScale: [
      {
        level: 'a1_confirmed',
        label: 'A1 — Confirmed, Reliable Source',
        description: 'Reliable source, credible information',
        color: '#00d900',
      },
      {
        level: 'b2_probable',
        label: 'B2 — Probably True, Usually Reliable',
        description: 'Usually reliable source, likely credible',
        color: '#00a600',
      },
      {
        level: 'c3_possible',
        label: 'C3 — Possibly True, Fairly Reliable',
        description: 'Fairly reliable source, may be credible',
        color: '#e5e500',
      },
      {
        level: 'd4_doubtful',
        label: 'D4 — Doubtful, Not Usually Reliable',
        description: 'Not usually reliable, credibility uncertain',
        color: '#e5a500',
      },
      {
        level: 'e5_improbable',
        label: 'E5 — Improbable, Unreliable',
        description: 'Unreliable source, not credible',
        color: '#e50000',
      },
    ],
  },
};

export function getTemplate(framework: ChallengeFramework): ChallengeTemplate {
  return CHALLENGE_TEMPLATES[framework];
}
