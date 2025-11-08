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
// Core resolvers
import { UserResolver } from './resolvers/UserResolver';
import { GraphResolver, NodeResolver, EdgeResolver } from './resolvers/GraphResolver';
import { NodeTypeResolver } from './resolvers/NodeTypeResolver';
import { EdgeTypeResolver } from './resolvers/EdgeTypeResolver';
import { CommentResolver } from './resolvers/CommentResolver';

// Challenge/Veracity resolvers (core features)
import { ChallengeResolver } from './resolvers/ChallengeResolver';
import { VeracityScoreResolver, EvidenceResolver, SourceResolver } from './resolvers/VeracityResolver';

// AI assistance
import { AIAssistantResolver } from './resolvers/AIAssistantResolver';
import { DeceptionDetectionResolver } from './resolvers/DeceptionDetectionResolver';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import Redis from 'ioredis';
// Temporarily disabled - ESM import issue
// import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';
import { NotificationService } from './services/NotificationService';
import { createPublicAPI } from './api/publicAPI';

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
      // Core graph resolvers
      UserResolver,
      GraphResolver,
      NodeResolver,
      EdgeResolver,
      NodeTypeResolver,
      EdgeTypeResolver,

      // Social layer (Comments)
      CommentResolver,

      // Truth-seeking layer (Challenges) - CORE FEATURE
      ChallengeResolver,

      // Credibility/Evidence system
      VeracityScoreResolver,
      EvidenceResolver,
      SourceResolver,

      // AI facilitation
      AIAssistantResolver,
      DeceptionDetectionResolver,
    ],
    pubSub,
    validate: true, // ✓ VALIDATION ENABLED (was: false)
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

      // Removed insecure x-user-id fallback - JWT only for security

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

  // Configure CORS - restrict to known origins
  const corsOptions: cors.CorsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  };

  // Mount Public REST API (read-only, no auth required)
  app.use('/api/v1/public', createPublicAPI(pool));

  // Rate limiting for GraphQL endpoint
  // Note: Install express-rate-limit: npm install express-rate-limit
  // import rateLimit from 'express-rate-limit';
  // const limiter = rateLimit({
  //   windowMs: 15 * 60 * 1000, // 15 minutes
  //   max: 100, // limit each IP to 100 requests per windowMs
  //   message: 'Too many requests from this IP, please try again later.'
  // });

  // Configure GraphQL middleware
  app.use(
    '/graphql',
    // limiter, // Enable after installing express-rate-limit
    cors<cors.CorsRequest>(corsOptions),
    bodyParser.json({ limit: '10mb' }), // Reduced from 50mb for security
    // graphqlUploadExpress({ maxFileSize: 104857600, maxFiles: 10 }), // TODO: Fix ESM import
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
  console.log(`📡 Public REST API ready at http://localhost:${PORT}/api/v1/public`);
}

main().catch(console.error);
