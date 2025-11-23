import { Resolver, Query, Arg, Ctx, ObjectType, Field, InputType, Int, Float } from 'type-graphql';
import { SearchService, SearchResult as ServiceSearchResult } from '../services/SearchService';
import { Context } from '../types/context';

@ObjectType()
class VeracityScoreInfo {
  @Field(() => Float)
  veracityScore!: number;

  @Field(() => Int, { nullable: true })
  evidenceCount?: number;

  @Field(() => Int, { nullable: true })
  challengeCount?: number;
}

@ObjectType()
class SearchResult {
  @Field()
  id!: string;

  @Field()
  title!: string;

  @Field()
  type!: string;

  @Field({ nullable: true })
  narrative?: string;

  @Field()
  relevance!: number;

  @Field()
  graphId!: string;

  @Field({ nullable: true })
  graph_name?: string;

  @Field(() => VeracityScoreInfo, { nullable: true })
  veracityScore?: VeracityScoreInfo;
}

@ObjectType()
class SearchResults {
  @Field(() => [SearchResult])
  articles!: SearchResult[];

  @Field(() => [SearchResult])
  nodes!: SearchResult[];
}

@InputType()
class SearchInput {
  @Field()
  query!: string;

  @Field(() => [String], { nullable: true })
  types?: string[];

  @Field({ nullable: true })
  graphId?: string;

  @Field({ nullable: true, defaultValue: 20 })
  limit?: number;

  @Field({ nullable: true, defaultValue: 0 })
  offset?: number;
}

@Resolver()
export class SearchResolver {
  private searchService: SearchService;

  constructor() {
    this.searchService = new SearchService();
  }

  @Query(() => SearchResults)
  async search(
    @Arg('input') input: SearchInput,
    @Ctx() { pool }: Context
  ): Promise<SearchResults> {
    try {
      const results = await this.searchService.search(pool, input.query, {
        types: input.types,
        graphId: input.graphId,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        articles: results.articles.map(this.mapSearchResult),
        nodes: results.nodes.map(this.mapSearchResult),
      };
    } catch (error) {
      console.error('Search error:', error);
      return { articles: [], nodes: [] };
    }
  }

  @Query(() => [String])
  async autocomplete(
    @Arg('query') query: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 5 }) limit: number,
    @Ctx() { pool }: Context
  ): Promise<string[]> {
    try {
      return await this.searchService.autocomplete(pool, query, limit);
    } catch (error) {
      console.error('Autocomplete error:', error);
      return [];
    }
  }

  private mapSearchResult(result: ServiceSearchResult): SearchResult {
    return {
      id: result.id,
      title: result.title,
      type: result.type,
      narrative: result.narrative,
      relevance: result.relevance,
      graphId: result.graphId,
      graph_name: result.graph_name,
      veracityScore: result.veracityScore ? {
        veracityScore: result.veracityScore.veracityScore,
        evidenceCount: result.veracityScore.evidenceCount,
        challengeCount: result.veracityScore.challengeCount,
      } : undefined,
    };
  }
}
