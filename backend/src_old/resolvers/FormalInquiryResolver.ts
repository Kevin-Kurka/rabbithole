import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Subscription,
  Root,
  ID
} from 'type-graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import {
  CreateFormalInquiryInput,
  CastVoteInput,
  UpdateConfidenceScoreInput
} from './FormalInquiryInput';
import { FormalInquiryService } from '../services/FormalInquiryService';

// Subscription topics
const INQUIRY_CREATED = 'INQUIRY_CREATED';
const INQUIRY_VOTE_CAST = 'INQUIRY_VOTE_CAST';
const INQUIRY_EVALUATED = 'INQUIRY_EVALUATED';

@Resolver()
export class FormalInquiryResolver {
  private inquiryService: FormalInquiryService;

  constructor() {
    this.inquiryService = new FormalInquiryService();
  }

  /**
   * QUERIES
   */

  @Query(() => [GraphQLJSON])
  async getFormalInquiries(
    @Ctx() { pool }: { pool: Pool },
    @Arg('nodeId', () => ID, { nullable: true }) nodeId?: string,
    @Arg('edgeId', () => ID, { nullable: true }) edgeId?: string,
    @Arg('status', { nullable: true }) status?: string
  ): Promise<any[]> {
    return this.inquiryService.getInquiries(pool, { nodeId, edgeId, status });
  }

  @Query(() => GraphQLJSON, { nullable: true })
  async getFormalInquiry(
    @Ctx() { pool }: { pool: Pool },
    @Arg('inquiryId', () => ID) inquiryId: string
  ): Promise<any> {
    return this.inquiryService.getInquiry(pool, inquiryId);
  }

  @Query(() => GraphQLJSON, { nullable: true })
  async getUserVote(
    @Ctx() { pool, userId }: { pool: Pool; userId: string },
    @Arg('inquiryId', () => ID) inquiryId: string
  ): Promise<any> {
    if (!userId) {
      return null;
    }

    return this.inquiryService.getUserVote(pool, inquiryId, userId);
  }

  /**
   * MUTATIONS
   */

  @Mutation(() => GraphQLJSON)
  async createFormalInquiry(
    @Arg('input') input: CreateFormalInquiryInput,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<any> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const inquiry = await this.inquiryService.createInquiry(pool, input, userId);

    // Publish to subscriptions
    await pubSub.publish(INQUIRY_CREATED, inquiry);

    return inquiry;
  }

  @Mutation(() => GraphQLJSON)
  async castVote(
    @Arg('input') input: CastVoteInput,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<any> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const vote = await this.inquiryService.castVote(pool, input, userId);

    // Publish to subscriptions
    await pubSub.publish(INQUIRY_VOTE_CAST, {
      inquiryId: input.inquiryId,
      voteType: input.voteType,
      userId,
    });

    return vote;
  }



  @Mutation(() => Boolean)
  async removeVote(
    @Arg('inquiryId', () => ID) inquiryId: string,
    @Ctx() { pool, userId }: { pool: Pool; userId: string }
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    return this.inquiryService.removeVote(pool, inquiryId, userId);
  }

  @Mutation(() => GraphQLJSON)
  async updateConfidenceScore(
    @Arg('input') input: UpdateConfidenceScoreInput,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<any> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const evaluatedInquiry = await this.inquiryService.updateConfidenceScore(
      pool,
      input,
      userId
    );

    // Publish to subscriptions
    await pubSub.publish(INQUIRY_EVALUATED, evaluatedInquiry);

    return evaluatedInquiry;
  }

  /**
   * SUBSCRIPTIONS
   */

  @Subscription(() => GraphQLJSON, {
    topics: INQUIRY_CREATED
  })
  inquiryCreated(
    @Root() inquiry: any
  ): any {
    return inquiry;
  }

  @Subscription(() => GraphQLJSON, {
    topics: INQUIRY_VOTE_CAST,
    filter: ({ payload, args }) => payload.inquiryId === args.inquiryId
  })
  inquiryVoteCast(
    @Root() vote: any,
    @Arg('inquiryId', () => ID) inquiryId: string
  ): any {
    return vote;
  }

  @Subscription(() => GraphQLJSON, {
    topics: INQUIRY_EVALUATED,
    filter: ({ payload, args }) => payload.id === args.inquiryId
  })
  inquiryEvaluated(
    @Root() inquiry: any,
    @Arg('inquiryId', () => ID) inquiryId: string
  ): any {
    return inquiry;
  }
}

export default FormalInquiryResolver;
