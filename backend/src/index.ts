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
import { CommentResolver } from './resolvers/CommentResolver';
import { MethodologyResolver } from './resolvers/MethodologyResolver';
import { MethodologyNodeTypeResolver } from './resolvers/MethodologyNodeTypeResolver';
import { MethodologyEdgeTypeResolver } from './resolvers/MethodologyEdgeTypeResolver';
import { MethodologyWorkflowResolver } from './resolvers/MethodologyWorkflowResolver';
import { UserMethodologyProgressResolver, MethodologyPermissionResolver } from './resolvers/UserMethodologyResolver';
import { VeracityScoreResolver, EvidenceResolver, SourceResolver, VeracityScoreHistoryResolver } from './resolvers/VeracityResolver';
import { ProcessValidationResolver } from './resolvers/ProcessValidationResolver';
import { AIAssistantResolver } from './resolvers/AIAssistantResolver';
import { EvidenceFileResolver } from './resolvers/EvidenceFileResolver';
import {
  CollaborationResolver,
  GraphShareResolver,
  PresenceResolver,
  ActivityResolver,
  ChatMessageResolver
} from './resolvers/CollaborationResolver';
import { GamificationResolver } from './resolvers/GamificationResolver';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import Redis from 'ioredis';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';

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

  const schema = await buildSchema({
    resolvers: [
      UserResolver,
      GraphResolver,
      CommentResolver,
      NodeResolver,
      EdgeResolver,
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
      EvidenceFileResolver,
      CollaborationResolver,
      GraphShareResolver,
      PresenceResolver,
      ActivityResolver,
      ChatMessageResolver,
      GamificationResolver
    ],
    pubSub,
    validate: false,
  });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer({ schema }, wsServer);

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
    ],
  });

  await server.start();

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Configure file upload middleware (must come before GraphQL middleware)
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    bodyParser.json({ limit: '50mb' }),
    graphqlUploadExpress({ maxFileSize: 104857600, maxFiles: 10 }), // 100MB max
    expressMiddleware(server, { context: async () => ({ pool, pubSub, redis }) }),
  );

  const PORT = process.env.PORT || 4000;

  await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
}

main().catch(console.error);
