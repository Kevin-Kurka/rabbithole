/**
 * Inquiry Workflow Configurations
 * 
 * Maps inquiry types to structured workflow steps.
 * Replaces the Methodology system with inquiry-specific workflows.
 */

export interface WorkflowStep {
    id: string;
    name: string;
    description: string;
    order: number;
    required: boolean;
    evidence_required: boolean;
    completion_criteria?: string;
}

export interface InquiryWorkflowConfig {
    name: string;
    description: string;
    steps: WorkflowStep[];
    is_linear: boolean;
    allow_skip: boolean;
    instructions?: string;
}

export const INQUIRY_WORKFLOWS: Record<string, InquiryWorkflowConfig> = {
    // Scientific Method Workflow
    scientific_inquiry: {
        name: 'Scientific Inquiry',
        description: 'Systematic investigation using the scientific method',
        is_linear: true,
        allow_skip: false,
        instructions: 'Follow the scientific method to investigate empirical claims',
        steps: [
            {
                id: 'question',
                name: 'Ask a Question',
                description: 'Define the research question or hypothesis to investigate',
                order: 1,
                required: true,
                evidence_required: false,
                completion_criteria: 'Clear, testable question stated'
            },
            {
                id: 'research',
                name: 'Background Research',
                description: 'Gather existing knowledge and prior research on the topic',
                order: 2,
                required: true,
                evidence_required: true,
                completion_criteria: 'Relevant sources identified and reviewed'
            },
            {
                id: 'hypothesis',
                name: 'Construct Hypothesis',
                description: 'Formulate a testable prediction based on research',
                order: 3,
                required: true,
                evidence_required: false,
                completion_criteria: 'Hypothesis clearly stated with expected outcome'
            },
            {
                id: 'methodology',
                name: 'Define Methodology',
                description: 'Design the experimental or observational approach',
                order: 4,
                required: true,
                evidence_required: false,
                completion_criteria: 'Clear methodology with controls and variables'
            },
            {
                id: 'data',
                name: 'Collect Data',
                description: 'Gather empirical evidence through experiments or observations',
                order: 5,
                required: true,
                evidence_required: true,
                completion_criteria: 'Sufficient data collected and documented'
            },
            {
                id: 'analysis',
                name: 'Analyze Results',
                description: 'Examine data for patterns, trends, and statistical significance',
                order: 6,
                required: true,
                evidence_required: false,
                completion_criteria: 'Data analyzed with appropriate methods'
            },
            {
                id: 'conclusion',
                name: 'Draw Conclusion',
                description: 'Determine if hypothesis is supported or refuted by evidence',
                order: 7,
                required: true,
                evidence_required: false,
                completion_criteria: 'Conclusion stated with confidence level'
            }
        ]
    },

    // Legal Discovery Workflow
    legal_analysis: {
        name: 'Legal Analysis',
        description: 'Systematic evidence gathering using legal discovery principles',
        is_linear: true,
        allow_skip: false,
        instructions: 'Follow legal discovery process to build evidence-based case',
        steps: [
            {
                id: 'identification',
                name: 'Identify Sources',
                description: 'Locate potential sources of relevant evidence',
                order: 1,
                required: true,
                evidence_required: false,
                completion_criteria: 'All potential evidence sources identified'
            },
            {
                id: 'preservation',
                name: 'Preserve Evidence',
                description: 'Collect and preserve evidence while maintaining integrity',
                order: 2,
                required: true,
                evidence_required: true,
                completion_criteria: 'Evidence collected with chain of custody'
            },
            {
                id: 'review',
                name: 'Review & Analyze',
                description: 'Examine evidence for relevance and significance',
                order: 3,
                required: true,
                evidence_required: false,
                completion_criteria: 'All evidence reviewed and categorized'
            },
            {
                id: 'production',
                name: 'Produce Findings',
                description: 'Present organized evidence with analysis and conclusions',
                order: 4,
                required: true,
                evidence_required: true,
                completion_criteria: 'Complete evidence package with analysis'
            }
        ]
    },

    // Factual Accuracy Inquiry
    factual_accuracy: {
        name: 'Factual Accuracy Check',
        description: 'Verify claims against primary sources and established facts',
        is_linear: false,
        allow_skip: true,
        steps: [
            {
                id: 'claim_identification',
                name: 'Identify Claim',
                description: 'Clearly state the factual claim being investigated',
                order: 1,
                required: true,
                evidence_required: false
            },
            {
                id: 'source_verification',
                name: 'Verify Sources',
                description: 'Identify and assess credibility of primary sources',
                order: 2,
                required: true,
                evidence_required: true
            },
            {
                id: 'cross_reference',
                name: 'Cross-Reference',
                description: 'Compare claim against multiple independent sources',
                order: 3,
                required: true,
                evidence_required: true
            }
        ]
    },

    // Logical Fallacy Detection
    logical_fallacy: {
        name: 'Logical Fallacy Analysis',
        description: 'Identify and document reasoning errors in arguments',
        is_linear: false,
        allow_skip: true,
        steps: [
            {
                id: 'argument_structure',
                name: 'Map Argument Structure',
                description: 'Identify premises, warrants, and conclusions',
                order: 1,
                required: true,
                evidence_required: false
            },
            {
                id: 'fallacy_identification',
                name: 'Identify Fallacies',
                description: 'Detect specific logical errors in reasoning',
                order: 2,
                required: true,
                evidence_required: true
            },
            {
                id: 'impact_assessment',
                name: 'Assess Impact',
                description: 'Determine how fallacy affects argument validity',
                order: 3,
                required: true,
                evidence_required: false
            }
        ]
    },

    // Source Reliability Assessment
    source_reliability: {
        name: 'Source Reliability Check',
        description: 'Evaluate credibility and trustworthiness of information sources',
        is_linear: false,
        allow_skip: true,
        steps: [
            {
                id: 'source_identification',
                name: 'Identify Source',
                description: 'Document source details and provenance',
                order: 1,
                required: true,
                evidence_required: true
            },
            {
                id: 'credibility_check',
                name: 'Check Credibility',
                description: 'Assess expertise, bias, and track record',
                order: 2,
                required: true,
                evidence_required: false
            },
            {
                id: 'verification',
                name: 'Verify Claims',
                description: 'Cross-check source claims against other evidence',
                order: 3,
                required: true,
                evidence_required: true
            }
        ]
    },

    // Bias Detection
    bias_detection: {
        name: 'Bias Detection',
        description: 'Identify potential biases in arguments or sources',
        is_linear: false,
        allow_skip: true,
        steps: [
            {
                id: 'bias_identification',
                name: 'Identify Potential Biases',
                description: 'Look for indicators of cognitive or ideological bias',
                order: 1,
                required: true,
                evidence_required: false
            },
            {
                id: 'evidence_collection',
                name: 'Collect Evidence',
                description: 'Document specific examples of biased reasoning',
                order: 2,
                required: true,
                evidence_required: true
            },
            {
                id: 'impact_analysis',
                name: 'Analyze Impact',
                description: 'Assess how bias affects argument validity',
                order: 3,
                required: true,
                evidence_required: false
            }
        ]
    },

    // Statistical Validity
    statistical_validity: {
        name: 'Statistical Validity Check',
        description: 'Verify proper use of statistical methods and data',
        is_linear: false,
        allow_skip: true,
        steps: [
            {
                id: 'data_review',
                name: 'Review Data',
                description: 'Examine dataset quality and completeness',
                order: 1,
                required: true,
                evidence_required: true
            },
            {
                id: 'method_verification',
                name: 'Verify Methods',
                description: 'Check if statistical methods are appropriate',
                order: 2,
                required: true,
                evidence_required: false
            },
            {
                id: 'conclusion_check',
                name: 'Validate Conclusions',
                description: 'Ensure conclusions are supported by statistical evidence',
                order: 3,
                required: true,
                evidence_required: false
            }
        ]
    },

    // Causal Relationship Analysis
    causal_relationship: {
        name: 'Causal Relationship Analysis',
        description: 'Evaluate claims of cause-and-effect relationships',
        is_linear: false,
        allow_skip: true,
        steps: [
            {
                id: 'relationship_claim',
                name: 'Define Causal Claim',
                description: 'Clearly state the proposed cause-effect relationship',
                order: 1,
                required: true,
                evidence_required: false
            },
            {
                id: 'evidence_review',
                name: 'Review Evidence',
                description: 'Examine evidence for correlation and causation',
                order: 2,
                required: true,
                evidence_required: true
            },
            {
                id: 'alternative_causes',
                name: 'Consider Alternatives',
                description: 'Identify and evaluate alternative explanations',
                order: 3,
                required: true,
                evidence_required: false
            }
        ]
    },

    // Missing Context
    missing_context: {
        name: 'Missing Context Analysis',
        description: 'Identify important context omitted from claims',
        is_linear: false,
        allow_skip: true,
        steps: [
            {
                id: 'context_identification',
                name: 'Identify Missing Context',
                description: 'Determine what relevant information is omitted',
                order: 1,
                required: true,
                evidence_required: false
            },
            {
                id: 'context_gathering',
                name: 'Gather Context',
                description: 'Collect the missing contextual information',
                order: 2,
                required: true,
                evidence_required: true
            },
            {
                id: 'impact_assessment',
                name: 'Assess Impact',
                description: 'Evaluate how missing context changes interpretation',
                order: 3,
                required: true,
                evidence_required: false
            }
        ]
    },

    // Historical Interpretation
    historical_interpretation: {
        name: 'Historical Interpretation',
        description: 'Analyze historical claims and interpretations',
        is_linear: false,
        allow_skip: true,
        steps: [
            {
                id: 'source_analysis',
                name: 'Analyze Primary Sources',
                description: 'Examine original historical documents and artifacts',
                order: 1,
                required: true,
                evidence_required: true
            },
            {
                id: 'context_review',
                name: 'Review Historical Context',
                description: 'Consider the broader historical circumstances',
                order: 2,
                required: true,
                evidence_required: false
            },
            {
                id: 'interpretation_evaluation',
                name: 'Evaluate Interpretation',
                description: 'Assess if interpretation is supported by evidence',
                order: 3,
                required: true,
                evidence_required: false
            }
        ]
    },

    // Ethical Evaluation
    ethical_evaluation: {
        name: 'Ethical Evaluation',
        description: 'Analyze ethical dimensions of claims or actions',
        is_linear: false,
        allow_skip: true,
        steps: [
            {
                id: 'ethical_framework',
                name: 'Define Ethical Framework',
                description: 'Identify the ethical principles being applied',
                order: 1,
                required: true,
                evidence_required: false
            },
            {
                id: 'stakeholder_analysis',
                name: 'Analyze Stakeholders',
                description: 'Identify affected parties and their interests',
                order: 2,
                required: true,
                evidence_required: false
            },
            {
                id: 'evaluation',
                name: 'Evaluate Ethics',
                description: 'Assess ethical implications and trade-offs',
                order: 3,
                required: true,
                evidence_required: true
            }
        ]
    },

    // Definition Dispute
    definition_dispute: {
        name: 'Definition Dispute Resolution',
        description: 'Resolve disagreements about term definitions',
        is_linear: false,
        allow_skip: true,
        steps: [
            {
                id: 'term_identification',
                name: 'Identify Disputed Term',
                description: 'Clearly state the term being disputed',
                order: 1,
                required: true,
                evidence_required: false
            },
            {
                id: 'definition_research',
                name: 'Research Definitions',
                description: 'Gather authoritative definitions from multiple sources',
                order: 2,
                required: true,
                evidence_required: true
            },
            {
                id: 'resolution',
                name: 'Resolve Dispute',
                description: 'Determine most appropriate definition for context',
                order: 3,
                required: true,
                evidence_required: false
            }
        ]
    }
};

/**
 * Get workflow configuration for an inquiry type
 */
export function getInquiryWorkflow(inquiryType: string): InquiryWorkflowConfig | null {
    return INQUIRY_WORKFLOWS[inquiryType] || null;
}

/**
 * Get all available inquiry workflows
 */
export function getAllInquiryWorkflows(): Record<string, InquiryWorkflowConfig> {
    return INQUIRY_WORKFLOWS;
}

/**
 * Check if an inquiry type has a workflow
 */
export function hasWorkflow(inquiryType: string): boolean {
    return inquiryType in INQUIRY_WORKFLOWS;
}
