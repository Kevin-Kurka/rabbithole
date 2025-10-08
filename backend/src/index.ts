import 'reflect-metadata';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import { buildSchema } from 'type-graphql';
import { Pool } from 'pg';
import { Resolver, Query } from 'type-graphql';

import { UserResolver } from './resolvers/UserResolver';

@Resolver()
class HelloWorldResolver {
  @Query(() => String)
  hello() {
    return 'Hello, World!';
  }
}

async function main() {
  const app = express();
  const httpServer = http.createServer(app);

  // Database connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Test the database connection
  try {
    await pool.query('SELECT NOW()');
    console.log('PostgreSQL connected successfully.');
  } catch (err) {
    console.error('PostgreSQL connection error:', err);
  }

  // Build the GraphQL schema
  const schema = await buildSchema({
    resolvers: [HelloWorldResolver, UserResolver],
    validate: false, // Disable validation for now
  });

  // Create the Apollo Server
  const server = new ApolloServer({
    schema,
  });

  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    bodyParser.json(),
    expressMiddleware(server),
  );

  const PORT = process.env.PORT || 4000;

  await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
}

main().catch(console.error);