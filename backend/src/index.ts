import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import { buildSchema } from 'type-graphql';
import { Pool } from 'pg';
import { UserResolver } from './resolvers/UserResolver';
import { GraphResolver, NodeResolver, EdgeResolver } from './resolvers/GraphResolver';
import { NodeTypeResolver } from './resolvers/NodeTypeResolver';
import { EdgeTypeResolver } from './resolvers/EdgeTypeResolver';
import { CommentResolver } from './resolvers/CommentResolver';
import { MethodologyResolver } from './resolvers/MethodologyResolver';
import { MethodologyNodeTypeResolver } from './resolvers/MethodologyNodeTypeResolver';
import { MethodologyEdgeTypeResolver } from './resolvers/MethodologyEdgeTypeResolver';
import { MethodologyWorkflowResolver } from './resolvers/MethodologyWorkflowResolver';
import { UserMethodologyProgressResolver, MethodologyPermissionResolver } from './resolvers/UserMethodologyResolver';
import { VeracityScoreResolver, EvidenceResolver, SourceResolver, VeracityScoreHistoryResolver } from './resolvers/VeracityResolver';
import { ProcessValidationResolver } from './resolvers/ProcessValidationResolver';
import { AIAssistantResolver } from './resolvers/AIAssistantResolver';
import { SearchResolver } from './resolvers/SearchResolver';
import { InquiryResolver } from './resolvers/InquiryResolver';
import { FormalInquiryResolver } from './resolvers/FormalInquiryResolver';
import { ArticleResolver } from './resolvers/ArticleResolver';
import { EvidenceFileResolver } from './resolvers/EvidenceFileResolver';
import {
  CollaborationResolver,
  GraphShareResolver,
  PresenceResolver,
  ActivityResolver,
  ChatMessageResolver
} from './resolvers/CollaborationResolver';
import { GamificationResolver } from './resolvers/GamificationResolver';
import { GraphVersionResolver } from './resolvers/GraphVersionResolver';
import { ContentAnalysisResolver } from './resolvers/ContentAnalysisResolver';
import { GraphTraversalResolver } from './resolvers/GraphTraversalResolver';
import { AdminConfigurationResolver } from './resolvers/AdminConfigurationResolver';
import {
  ConversationalAIResolver,
  ConversationFieldResolver,
  ConversationMessageFieldResolver,
  ConversationalAIResponseFieldResolver
} from './resolvers/ConversationalAIResolver';
import { FactCheckingResolver } from './resolvers/FactCheckingResolver';
import { PostActivityResolver } from './resolvers/ActivityResolver';
import { NodeAssociationResolver } from './resolvers/NodeAssociationResolver';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import Redis from 'ioredis';
import { NotificationService } from './services/NotificationService';

async function main() {
  const app = express();
  const httpServer = http.createServer(app);

  const options = {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    retryStrategy: (times: number) => {
      return Math.min(times * 50, 2000);
    }
  };

  const redis = new Redis(options);
  const pubSub = new RedisPubSub({
    publisher: new Redis(options),
    subscriber: new Redis(options)
  });

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Initialize NotificationService
  const notificationService = new NotificationService(pool, pubSub);

  const schema = await buildSchema({
    resolvers: [
      UserResolver,
      GraphResolver,
      CommentResolver,
      NodeResolver,
      EdgeResolver,
      NodeTypeResolver,
      EdgeTypeResolver,
      MethodologyResolver,
      MethodologyNodeTypeResolver,
      MethodologyEdgeTypeResolver,
      MethodologyWorkflowResolver,
      UserMethodologyProgressResolver,
      MethodologyPermissionResolver,
      VeracityScoreResolver,
      EvidenceResolver,
      SourceResolver,
      VeracityScoreHistoryResolver,
      ProcessValidationResolver,
      AIAssistantResolver,
      SearchResolver,
      InquiryResolver,
      FormalInquiryResolver,
      ArticleResolver,
      EvidenceFileResolver,
      CollaborationResolver,
      GraphShareResolver,
      PresenceResolver,
      ActivityResolver,
      ChatMessageResolver,
      GamificationResolver,
      GraphVersionResolver,
      ContentAnalysisResolver,
      GraphTraversalResolver,
      AdminConfigurationResolver,
      ConversationalAIResolver,
      ConversationFieldResolver,
      ConversationMessageFieldResolver,
      ConversationalAIResponseFieldResolver,
      FactCheckingResolver,
      PostActivityResolver,
      NodeAssociationResolver
    ],
    pubSub,
    validate: false,
  });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer({
    schema,
    context: async (ctx) => {
      // Extract authentication from WebSocket connection params
      const connectionParams = ctx.connectionParams as {
        'x-user-id'?: string;
        Authorization?: string;
      } | undefined;

      let userId: string | null = null;

      // First check for JWT token
      if (connectionParams?.Authorization) {
        const { verifyToken } = await import('./middleware/auth');
        const token = connectionParams.Authorization.replace('Bearer ', '');
        const payload = verifyToken(token);
        if (payload) {
          userId = payload.userId;
        }
      }

      // Fallback to x-user-id for backwards compatibility
      if (!userId && connectionParams?.['x-user-id']) {
        userId = connectionParams['x-user-id'];
      }

      return {
        pool,
        pubSub,
        redis,
        notificationService,
        userId,
      };
    },
  }, wsServer);

  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
      {
        async requestDidStart() {
          return {
            async didEncounterErrors(requestContext) {
              const { errors, request } = requestContext;
              if (errors) {
                console.error('GraphQL Errors:', {
                  operation: request.operationName,
                  variables: request.variables,
                  errors: errors.map(err => ({
                    message: err.message,
                    path: err.path,
                    extensions: err.extensions
                  }))
                });
              }
            }
          };
        }
      }
    ],
  });

  await server.start();

  // Import graphql-upload middleware dynamically (ESM module)
  let uploadMiddleware: any;
  try {
    const { default: graphqlUploadExpress } = await import('graphql-upload/graphqlUploadExpress.mjs');
    uploadMiddleware = graphqlUploadExpress({
      maxFileSize: 104857600, // 100MB
      maxFiles: 10
    });
    console.log('✓ File upload middleware enabled');
  } catch (error) {
    console.warn('⚠ File upload middleware not available:', error);
    uploadMiddleware = (req: any, res: any, next: any) => next(); // Noop middleware
  }

  // Configure GraphQL middleware
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    bodyParser.json({ limit: '50mb' }),
    uploadMiddleware,
    expressMiddleware(server, {
      context: async ({ req }) => {
        // Extract user context from JWT token or fallback to header
        const { getAuthContext } = await import('./middleware/auth');
        const authContext = getAuthContext(req);

        // Log authentication context for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('GraphQL Request:', {
            operation: req.body?.operationName,
            userId: authContext.userId || '(none)',
            isAuthenticated: authContext.isAuthenticated,
          });
        }

        return {
          pool,
          pubSub,
          redis,
          notificationService,
          userId: authContext.userId,
          isAuthenticated: authContext.isAuthenticated,
          user: authContext.user,
          req
        };
      }
    }),
  );

  const PORT = process.env.PORT || 4000;

  await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
}

main().catch(console.error);
