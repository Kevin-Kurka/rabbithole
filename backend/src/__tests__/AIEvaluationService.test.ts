import { Pool } from 'pg';
import { AIEvaluationService, InquiryPosition } from '../services/AIEvaluationService';
import { ConversationalAIService } from '../services/ConversationalAIService';

// Mock dependencies
jest.mock('pg');
jest.mock('../services/ConversationalAIService');

describe('AIEvaluationService', () => {
    let service: AIEvaluationService;
    let mockPool: jest.Mocked<Pool>;
    let mockAIService: jest.Mocked<ConversationalAIService>;

    beforeEach(() => {
        // Clear mocks
        jest.clearAllMocks();

        // Setup mocks
        mockPool = new Pool() as jest.Mocked<Pool>;
        mockAIService = new ConversationalAIService() as jest.Mocked<ConversationalAIService>;

        // Initialize service
        service = new AIEvaluationService(mockPool, mockAIService);
    });

    describe('evaluatePosition', () => {
        const mockPosition: InquiryPosition = {
            stance: 'supporting',
            argument: 'Test argument',
            evidence: [{ type: 'source', content: 'Test evidence' }],
            inquiryType: 'factual_accuracy'
        };

        it('should route factual_accuracy to the correct evaluator', async () => {
            // Mock AI response
            const mockAIResponse = JSON.stringify({
                primarySourceScore: 0.8,
                crossReferenceScore: 0.7,
                temporalRelevanceScore: 0.9,
                expertConsensusScore: 0.6,
                strengths: ['Strength 1'],
                weaknesses: ['Weakness 1'],
                suggestions: ['Suggestion 1']
            });

            mockAIService.chat.mockResolvedValueOnce(mockAIResponse); // For main evaluation
            mockAIService.chat.mockResolvedValueOnce('0.85'); // For coherence check

            const result = await service.evaluatePosition(mockPosition);

            expect(result.overallScore).toBeGreaterThan(0);
            expect(mockAIService.chat).toHaveBeenCalledWith(
                expect.stringMatching(/Evaluate this factual accuracy challenge/i),
                expect.any(String)
            );
        });

        it('should handle generic evaluation for unknown types', async () => {
            const unknownPos = { ...mockPosition, inquiryType: 'unknown_type' };

            mockAIService.chat.mockResolvedValueOnce(JSON.stringify({
                evidenceQualityScore: 0.5,
                coherenceScore: 0.5,
                strengths: [],
                weaknesses: [],
                suggestions: []
            }));

            const result = await service.evaluatePosition(unknownPos);
            expect(result.overallScore).toBe(0.5);
        });

        it('should parse markdown json blocks gracefully', async () => {
            const markdownResponse = '```json\n{"primarySourceScore": 0.9}\n```';
            mockAIService.chat.mockResolvedValueOnce(markdownResponse);
            mockAIService.chat.mockResolvedValueOnce('0.9');

            const result = await service.evaluatePosition(mockPosition);
            expect(result.evidenceQualityScore).toBeGreaterThan(0);
        });
    });

    describe('evaluateLogicalFallacy', () => {
        const fallacyPos: InquiryPosition = {
            stance: 'opposing',
            argument: 'Ad hominem attack',
            evidence: [],
            inquiryType: 'logical_fallacy'
        };

        it('should evaluate logical fallacy correctly', async () => {
            mockAIService.chat.mockResolvedValueOnce(JSON.stringify({
                fallacyIdentificationScore: 0.9,
                explanationClarityScore: 0.8,
                counterExamplesScore: 0.7,
                logicalStructureScore: 0.6
            }));
            mockAIService.chat.mockResolvedValueOnce('0.8');

            const result = await service.evaluatePosition(fallacyPos);
            // (0.9*0.4 + 0.8*0.3 + 0.7*0.2 + 0.6*0.1) = 0.36 + 0.24 + 0.14 + 0.06 = 0.8
            expect(result.evidenceQualityScore).toBeCloseTo(0.8);
        });
    });
});
