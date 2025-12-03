import { ObjectType, Field, ID, Int, Float, InputType, registerEnumType } from 'type-graphql';

@ObjectType()
export class User {
    @Field(() => ID)
    id: string;

    @Field()
    username: string;

    @Field()
    email: string;

    @Field()
    created_at: Date;

    @Field()
    updated_at: Date;

    // Helper to map from Node to User
    static fromNode(node: any): User {
        const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;
        return {
            id: node.id,
            username: props.username,
            email: props.email,
            created_at: node.created_at,
            updated_at: node.updated_at
        };
    }
}

@ObjectType()
export class Notification {
    @Field(() => ID)
    id: string;

    @Field()
    userId: string;

    @Field()
    type: string;

    @Field()
    message: string;

    @Field()
    read: boolean;

    @Field()
    created_at: Date;
}

@ObjectType()
export class VeracityScore {
    @Field(() => ID)
    id: string;

    @Field(() => Float)
    veracity_score: number;

    @Field(() => Float)
    confidence: number;

    @Field(() => Int)
    evidence_count: number;
}

@ObjectType()
export class Comment {
    @Field(() => ID)
    id: string;

    @Field()
    text: string;

    @Field()
    created_at: Date;

    @Field()
    createdBy: string;

    @Field(() => User)
    author: User;

    @Field(() => ID, { nullable: true })
    parentCommentId?: string;
}

@ObjectType()
export class Node {
    @Field(() => ID)
    id: string;

    @Field()
    type: string; // Mapped from node_type_id

    @Field(() => String, { nullable: true })
    props: string; // JSON string

    @Field(() => String, { nullable: true })
    meta: string; // JSON string

    @Field()
    created_at: Date;

    @Field()
    updated_at: Date;
}

@ObjectType()
export class Edge {
    @Field(() => ID)
    id: string;

    @Field()
    type: string; // Mapped from edge_type_id

    @Field(() => ID)
    source_node_id: string;

    @Field(() => ID)
    target_node_id: string;

    @Field(() => String, { nullable: true })
    props: string;

    @Field(() => String, { nullable: true })
    meta: string;

    @Field()
    created_at: Date;

    @Field()
    updated_at: Date;
}

@ObjectType()
export class Graph {
    @Field(() => ID)
    id: string;

    @Field()
    name: string;

    @Field({ nullable: true })
    description?: string;

    @Field(() => [Node])
    nodes: Node[];

    @Field(() => [Edge])
    edges: Edge[];

    @Field()
    created_at: Date;

    @Field()
    updated_at: Date;
}

export enum MethodologyStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    ARCHIVED = 'archived'
}

export enum MethodologyCategory {
    RESEARCH = 'research',
    ANALYSIS = 'analysis',
    INVESTIGATION = 'investigation',
    OTHER = 'other'
}

export enum MethodologyPermissionLevel {
    VIEW = 'view',
    COMMENT = 'comment',
    EDIT = 'edit',
    ADMIN = 'admin'
}

registerEnumType(MethodologyStatus, {
    name: "MethodologyStatus",
    description: "Status of a methodology",
});

registerEnumType(MethodologyCategory, {
    name: "MethodologyCategory",
    description: "Category of a methodology",
});


registerEnumType(MethodologyPermissionLevel, {
    name: "MethodologyPermissionLevel",
    description: "Permission level for a methodology",
});

@ObjectType()
export class MethodologyPermission {
    @Field(() => ID)
    methodology_id: string;

    @Field(() => ID)
    user_id: string;

    @Field(() => MethodologyPermissionLevel)
    permission_level: MethodologyPermissionLevel;

    @Field({ nullable: true })
    shared_by?: string;

    @Field({ nullable: true })
    shared_at?: Date;

    @Field({ nullable: true })
    expires_at?: Date;
}

@ObjectType()
export class UserMethodologyProgress {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    user_id: string;

    @Field(() => ID)
    graph_id: string;

    @Field(() => ID)
    methodology_id: string;

    @Field(() => Int)
    current_step: number;

    @Field(() => [String])
    completed_steps: string[];

    @Field({ nullable: true })
    step_data?: string; // JSON

    @Field()
    status: string;

    @Field(() => Int)
    completion_percentage: number;

    @Field()
    last_active_at: Date;

    @Field({ nullable: true })
    completed_at?: Date;
}

@ObjectType()
export class PromotionEvent {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    graph_id: string;

    @Field()
    graph_name: string;

    @Field(() => Int)
    previous_level: number;

    @Field(() => Int)
    new_level: number;

    @Field()
    promoted_at: Date;

    @Field()
    promotion_reason: string;
}

@ObjectType()
export class ConsensusVote {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    graph_id: string;

    @Field(() => ID)
    user_id: string;

    @Field(() => User)
    voter: User;

    @Field(() => Float)
    vote_value: number;

    @Field({ nullable: true })
    reasoning?: string;

    @Field(() => Float)
    vote_weight: number;

    @Field(() => Float)
    voter_reputation_score: number;

    @Field()
    created_at: Date;

    @Field()
    updated_at: Date;
}

@ObjectType()
export class PromotionEligibility {
    @Field(() => ID)
    graph_id: string;

    @Field(() => Float)
    methodology_completion_score: number;

    @Field(() => Float)
    consensus_score: number;

    @Field(() => Float)
    evidence_quality_score: number;

    @Field(() => Float)
    challenge_resolution_score: number;

    @Field(() => Float)
    overall_score: number;

    @Field()
    is_eligible: boolean;

    @Field({ nullable: true })
    blocking_reason?: string;

    @Field(() => [String])
    missing_requirements: string[];

    @Field()
    calculated_at: Date;
}

@ObjectType()
export class ConsensusStatus {
    @Field(() => ID)
    graph_id: string;

    @Field(() => Int)
    total_votes: number;

    @Field(() => Float)
    weighted_consensus_score: number;

    @Field(() => Float)
    unweighted_consensus_score: number;

    @Field(() => Int)
    approve_votes: number;

    @Field(() => Int)
    reject_votes: number;

    @Field(() => Int)
    neutral_votes: number;

    @Field(() => Int)
    minimum_votes_threshold: number;

    @Field()
    has_sufficient_votes: boolean;

    @Field()
    consensus_reached: boolean;

    @Field({ nullable: true })
    last_vote_at?: Date;

    @Field()
    calculated_at: Date;
}

@ObjectType()
export class UserReputation {
    @Field(() => ID)
    user_id: string;

    @Field(() => Float)
    evidence_quality_score: number;

    @Field(() => Int)
    total_evidence_submitted: number;

    @Field(() => Int)
    verified_evidence_count: number;

    @Field(() => Int)
    rejected_evidence_count: number;

    @Field(() => Float)
    consensus_participation_rate: number;

    @Field(() => Int)
    total_votes_cast: number;

    @Field(() => Float)
    vote_alignment_score: number;

    @Field(() => Int)
    methodology_completions: number;

    @Field(() => Int)
    challenges_raised: number;

    @Field(() => Int)
    challenges_resolved: number;

    @Field(() => Float)
    overall_reputation_score: number;

    @Field()
    calculated_at: Date;
}

@ObjectType()
export class MethodologyCompletionTracking {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    graph_id: string;

    @Field(() => ID)
    step_id: string;

    @Field()
    step_name: string;

    @Field(() => ID)
    completed_by: string;

    @Field()
    completed_at: Date;

    @Field({ nullable: true })
    notes?: string;

    @Field()
    is_verified: boolean;

    @Field({ nullable: true })
    verification_notes?: string;
}

@ObjectType()
export class PromotionResult {
    @Field(() => ID)
    graph_id: string;

    @Field()
    promotion_successful: boolean;

    @Field(() => Int)
    previous_level: number;

    @Field({ nullable: true })
    new_level?: number;

    @Field(() => PromotionEligibility)
    eligibility_breakdown: PromotionEligibility;

    @Field({ nullable: true })
    promotion_message?: string;

    @Field({ nullable: true })
    failure_reason?: string;

    @Field(() => [String])
    detailed_requirements: string[];

    @Field()
    evaluated_at: Date;

    @Field(() => ID)
    evaluated_by: string;
}

@ObjectType()
export class MethodologyWorkflowStep {
    @Field(() => ID)
    step_id: string;

    @Field()
    step_name: string;

    @Field()
    step_description: string;

    @Field(() => Int)
    step_order: number;

    @Field()
    is_required: boolean;

    @Field()
    is_completed: boolean;

    @Field({ nullable: true })
    completed_at?: Date;

    @Field({ nullable: true })
    completed_by?: string;
}

@ObjectType()
export class MethodologyProgress {
    @Field(() => ID)
    graph_id: string;

    @Field(() => ID)
    methodology_id: string;

    @Field()
    methodology_name: string;

    @Field(() => Int)
    total_steps: number;

    @Field(() => Int)
    completed_steps: number;

    @Field(() => Int)
    required_steps: number;

    @Field(() => Int)
    completed_required_steps: number;

    @Field(() => Float)
    completion_percentage: number;

    @Field(() => Float)
    required_completion_percentage: number;

    @Field(() => [MethodologyWorkflowStep])
    workflow_steps: MethodologyWorkflowStep[];

    @Field()
    is_methodology_complete: boolean;

    @Field()
    calculated_at: Date;
}

export enum EdgeLineStyle {
    SOLID = 'solid',
    DASHED = 'dashed',
    DOTTED = 'dotted'
}

export enum EdgeArrowStyle {
    ARROW = 'arrow',
    NONE = 'none',
    CIRCLE = 'circle'
}

registerEnumType(EdgeLineStyle, {
    name: "EdgeLineStyle",
    description: "Style of the edge line",
});

registerEnumType(EdgeArrowStyle, {
    name: "EdgeArrowStyle",
    description: "Style of the edge arrow",
});

@ObjectType()
export class MethodologyNodeType {
    @Field(() => ID)
    id: string;

    @Field()
    name: string;

    @Field()
    display_name: string;

    @Field({ nullable: true })
    description?: string;

    @Field({ nullable: true })
    icon?: string;

    @Field({ nullable: true })
    color?: string;

    @Field()
    properties_schema: string; // JSON

    @Field({ nullable: true })
    default_properties?: string; // JSON

    @Field(() => [String], { nullable: true })
    required_properties?: string[];

    @Field({ nullable: true })
    constraints?: string; // JSON

    @Field({ nullable: true })
    suggestions?: string; // JSON

    @Field({ nullable: true })
    visual_config?: string; // JSON

    @Field(() => Int)
    display_order: number;
}

@ObjectType()
export class MethodologyEdgeType {
    @Field(() => ID)
    id: string;

    @Field()
    name: string;

    @Field()
    display_name: string;

    @Field({ nullable: true })
    description?: string;

    @Field()
    is_directed: boolean;

    @Field()
    is_bidirectional: boolean;

    @Field(() => [String])
    valid_source_types: string[];

    @Field(() => [String])
    valid_target_types: string[];

    @Field({ nullable: true })
    source_cardinality?: string; // JSON

    @Field({ nullable: true })
    target_cardinality?: string; // JSON

    @Field({ nullable: true })
    line_style?: string;

    @Field({ nullable: true })
    line_color?: string;

    @Field({ nullable: true })
    arrow_style?: string;

    @Field()
    properties_schema: string; // JSON

    @Field({ nullable: true })
    default_properties?: string; // JSON

    @Field(() => Int)
    display_order: number;
}

@ObjectType()
export class MethodologyWorkflow {
    @Field(() => ID)
    id: string;

    @Field(() => [String])
    steps: string[]; // JSON array of steps

    @Field({ nullable: true })
    initial_canvas_state?: string; // JSON

    @Field()
    is_linear: boolean;

    @Field()
    allow_skip: boolean;

    @Field()
    require_completion: boolean;

    @Field({ nullable: true })
    instructions?: string;

    @Field({ nullable: true })
    tutorial_url?: string;

    @Field({ nullable: true })
    example_graph_id?: string;
}

@ObjectType()
export class Methodology {
    @Field(() => ID)
    id: string;

    @Field()
    name: string;

    @Field({ nullable: true })
    description?: string;

    @Field()
    category: string;

    @Field()
    status: string;

    @Field({ nullable: true })
    icon?: string;

    @Field({ nullable: true })
    color?: string;

    @Field(() => [String])
    tags: string[];

    @Field({ nullable: true })
    config?: string; // JSON

    @Field()
    created_by: string;

    @Field()
    is_system: boolean;

    @Field({ nullable: true })
    parent_methodology_id?: string;

    @Field()
    version: number;

    @Field()
    created_at: Date;

    @Field()
    updated_at: Date;

    @Field(() => [MethodologyNodeType])
    node_types: MethodologyNodeType[];

    @Field(() => [MethodologyEdgeType])
    edge_types: MethodologyEdgeType[];

    @Field(() => MethodologyWorkflow, { nullable: true })
    workflow?: MethodologyWorkflow;

    @Field(() => Float, { nullable: true })
    rating?: number;

    @Field(() => Int, { nullable: true })
    usage_count?: number;
}

@ObjectType()
export class ActivityPost {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    node_id: string;

    @Field(() => Node, { nullable: true })
    node?: Node;

    @Field(() => ID)
    author_id: string;

    @Field(() => User, { nullable: true })
    author?: User;

    @Field()
    content: string;

    @Field(() => [ID])
    mentioned_node_ids: string[];

    @Field(() => [ID])
    attachment_ids: string[];

    @Field()
    is_reply: boolean;

    @Field({ nullable: true })
    parent_post_id?: string;

    @Field()
    is_share: boolean;

    @Field({ nullable: true })
    shared_post_id?: string;

    @Field(() => Int)
    replyCount: number;

    @Field(() => Int)
    shareCount: number;

    @Field()
    reactionCounts: string; // JSON

    @Field(() => Int)
    totalReactionCount: number;

    @Field()
    created_at: Date;

    @Field()
    updated_at: Date;

    @Field({ nullable: true })
    deleted_at?: Date;

    @Field(() => [String])
    userReactions: string[];
}

@InputType()
export class CreatePostInput {
    @Field(() => ID)
    nodeId: string;

    @Field()
    content: string;

    @Field(() => [ID], { nullable: true })
    mentionedNodeIds?: string[];

    @Field(() => [ID], { nullable: true })
    attachmentIds?: string[];
}

@InputType()
export class ReplyToPostInput {
    @Field(() => ID)
    parentPostId: string;

    @Field()
    content: string;

    @Field(() => [ID], { nullable: true })
    mentionedNodeIds?: string[];

    @Field(() => [ID], { nullable: true })
    attachmentIds?: string[];
}

@InputType()
export class SharePostInput {
    @Field(() => ID)
    postId: string;

    @Field({ nullable: true })
    comment?: string;
}



@ObjectType()
export class CuratorReview {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    auditLogId: string;

    @Field(() => ID, { nullable: true })
    reviewerId?: string;

    @Field()
    reviewType: string;

    @Field(() => Float)
    rating: number;

    @Field()
    verdict: string;

    @Field({ nullable: true })
    comments?: string;

    @Field({ nullable: true })
    specificConcerns?: string;

    @Field({ nullable: true })
    recommendations?: string;

    @Field({ nullable: true })
    actionRequired?: string;

    @Field({ nullable: true })
    actionTaken?: string;

    @Field()
    escalated: boolean;

    @Field(() => ID, { nullable: true })
    escalatedToUserId?: string;

    @Field(() => Date)
    reviewedAt: Date;

    @Field(() => Date)
    createdAt: Date;
}

@ObjectType()
export class CuratorRole {
    @Field(() => ID)
    id: string;

    @Field()
    roleName: string;

    @Field({ nullable: true })
    displayName?: string;

    @Field({ nullable: true })
    description?: string;

    @Field(() => Int)
    tier: number;

    @Field(() => Int)
    minReputationRequired: number;

    @Field(() => Int)
    minContributionsRequired: number;

    @Field(() => [String])
    expertiseAreasRequired: string[];

    @Field()
    requiresApplication: boolean;

    @Field()
    requiresCommunityVote: boolean;

    @Field(() => Int)
    minVotesRequired: number;

    @Field(() => Float)
    approvalThreshold: number;

    @Field({ nullable: true })
    icon?: string;

    @Field({ nullable: true })
    color?: string;

    @Field({ nullable: true })
    badgeImageUrl?: string;

    @Field()
    isActive: boolean;

    @Field()
    created_at: Date;

    @Field()
    updated_at: Date;
}

@ObjectType()
export class RolePermission {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    roleId: string;

    @Field()
    permissionType: string;

    @Field()
    resourceType: string;

    @Field()
    canCreate: boolean;

    @Field()
    canRead: boolean;

    @Field()
    canEdit: boolean;

    @Field()
    canDelete: boolean;

    @Field()
    canApprove: boolean;

    @Field()
    canReject: boolean;

    @Field()
    canPromoteToLevel0: boolean;

    @Field()
    canDemoteFromLevel0: boolean;

    @Field()
    canAssignVeracityScore: boolean;

    @Field()
    canOverrideConsensus: boolean;

    @Field(() => Int)
    maxDailyActions: number;

    @Field()
    requiresPeerReview: boolean;

    @Field()
    requiresSecondApproval: boolean;

    @Field()
    description: string;

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;
}

@ObjectType()
export class UserCurator {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    userId: string;

    @Field(() => ID)
    roleId: string;

    @Field()
    status: string;

    @Field()
    assignedAt: Date;

    @Field(() => ID, { nullable: true })
    assignedByUserId?: string;

    @Field({ nullable: true })
    expiresAt?: Date;

    @Field(() => [String])
    expertiseAreas: string[];

    @Field(() => [String])
    specializationTags: string[];

    @Field({ nullable: true })
    notes?: string;

    @Field(() => CuratorStats)
    stats: CuratorStats;

    @Field()
    created_at: Date;

    @Field()
    updated_at: Date;
}

@ObjectType()
export class CuratorStats {
    @Field(() => Int)
    totalActions: number;

    @Field(() => Int)
    approvedActions: number;

    @Field(() => Int)
    rejectedActions: number;

    @Field(() => Int, { nullable: true })
    overturnedActions?: number;

    @Field(() => Float, { nullable: true })
    peerReviewScore?: number;

    @Field(() => Float, { nullable: true })
    communityTrustScore?: number;

    @Field(() => Float, { nullable: true })
    accuracyRate?: number;
}

@ObjectType()
export class CuratorApplication {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    userId: string;

    @Field(() => ID)
    roleId: string;

    @Field()
    status: string;

    @Field()
    applicationStatement: string;

    @Field()
    motivation: string;

    @Field(() => [String])
    expertiseAreas: string[];

    @Field()
    relevantExperience: string;

    @Field(() => [String], { nullable: true })
    sampleContributions?: string[];

    @Field(() => Date)
    submittedAt: Date;

    @Field(() => CuratorApplicationStats)
    stats: CuratorApplicationStats;

    @Field({ nullable: true })
    votingStartedAt?: Date;

    @Field({ nullable: true })
    votingDeadline?: Date;

    @Field(() => Int, { nullable: true })
    votesFor?: number;

    @Field(() => Int, { nullable: true })
    votesAgainst?: number;

    @Field(() => Int, { nullable: true })
    votesAbstain?: number;

    @Field(() => Int, { nullable: true })
    totalVotingWeight?: number;

    @Field({ nullable: true })
    reviewedByUserId?: string;

    @Field({ nullable: true })
    reviewedAt?: Date;

    @Field({ nullable: true })
    decision?: string;

    @Field({ nullable: true })
    decisionReason?: string;

    @Field({ nullable: true })
    reviewerNotes?: string;

    @Field({ nullable: true })
    conditionsForApproval?: string;

    @Field(() => Int, { nullable: true })
    probationPeriodDays?: number;

    @Field(() => Date, { nullable: true })
    decisionMadeAt?: Date;

    @Field(() => Date)
    created_at: Date;

    @Field(() => Date)
    updated_at: Date;
}

@ObjectType()
export class CuratorApplicationStats {
    @Field(() => Int)
    reputation: number;

    @Field(() => Int)
    contributions: number;

    @Field(() => Int)
    challengesWon: number;
}

@ObjectType()
export class CuratorApplicationVote {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    applicationId: string;

    @Field(() => ID)
    voterId: string;

    @Field()
    vote: string;

    @Field(() => Float)
    voteWeight: number;

    @Field({ nullable: true })
    rationale?: string;

    @Field(() => Date)
    votedAt: Date;
}

@ObjectType()
export class CuratorAuditLog {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    curatorId: string;

    @Field(() => ID)
    performedByUserId: string;

    @Field()
    action: string;

    @Field()
    resource: string;

    @Field({ nullable: true })
    resourceId?: string;

    @Field({ nullable: true })
    details?: string;

    @Field(() => Date)
    performedAt: Date;
}
