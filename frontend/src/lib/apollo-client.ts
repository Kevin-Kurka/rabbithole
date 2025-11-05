import { ApolloClient, InMemoryCache, HttpLink, split, ApolloLink } from "@apollo/client";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { setContext } from "@apollo/client/link/context";
import { getSession } from "next-auth/react";

/**
 * Detect if we're running in SSR (server-side) or browser context
 * SSR needs to use Docker service names, browser uses localhost
 */
const isSSR = typeof window === 'undefined';

/**
 * Get the appropriate GraphQL HTTP endpoint based on environment
 */
const getHttpUri = () => {
  // Use environment variable if provided
  if (process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL) {
    return process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL;
  }

  // In SSR context (Docker), use service name
  if (isSSR) {
    return "http://api:4000/graphql";
  }

  // In browser context, use localhost
  return "http://localhost:4000/graphql";
};

/**
 * Get the appropriate GraphQL WebSocket endpoint (browser only)
 */
const getWsUri = () => {
  // Use environment variable if provided
  if (process.env.NEXT_PUBLIC_GRAPHQL_WS_URL) {
    return process.env.NEXT_PUBLIC_GRAPHQL_WS_URL;
  }

  // WebSocket only works in browser, always use localhost
  return "ws://localhost:4000/graphql";
};

/**
 * Auth link to add user authentication headers to requests
 * Supports both JWT tokens and NextAuth session (backwards compatible)
 */
const authLink = setContext(async (_, { headers }) => {
  let authHeader = '';
  let userId = null;

  if (!isSSR && typeof window !== 'undefined') {
    try {
      // Try JWT token first (preferred method)
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        authHeader = `Bearer ${accessToken}`;
      } else {
        // Fallback to NextAuth session for backwards compatibility
        const session = await getSession();
        userId = session?.user?.id || null;
      }
    } catch (error) {
      console.error('Failed to get auth credentials:', error);
    }
  }

  return {
    headers: {
      ...headers,
      ...(authHeader ? { authorization: authHeader } : {}),
      'x-user-id': userId || '', // Backwards compatibility
    }
  };
});

const httpLink = new HttpLink({
  uri: getHttpUri(),
});

// Combine auth link with http link
const httpLinkWithAuth = authLink.concat(httpLink);

/**
 * Only create WebSocket link in browser context
 * SSR doesn't support WebSockets
 */
const wsLink = !isSSR
  ? new GraphQLWsLink(createClient({
      url: getWsUri(),
      connectionParams: async () => {
        try {
          // Try JWT token first
          const accessToken = typeof window !== 'undefined'
            ? localStorage.getItem('accessToken')
            : null;

          if (accessToken) {
            return {
              authorization: `Bearer ${accessToken}`,
            };
          }

          // Fallback to NextAuth session
          const session = await getSession();
          const userId = session?.user?.id || null;
          return {
            'x-user-id': userId || '',
          };
        } catch (error) {
          console.error('Failed to get auth for WebSocket:', error);
          return {
            'x-user-id': '',
          };
        }
      },
    }))
  : null;

/**
 * Split traffic between WebSocket (subscriptions) and HTTP (queries/mutations)
 * Only use split if we have a WebSocket link
 */
const link = wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === "OperationDefinition" &&
          definition.operation === "subscription"
        );
      },
      wsLink,
      httpLinkWithAuth, // Use auth-enabled HTTP link
    )
  : httpLinkWithAuth;

const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
  // Disable SSR for queries to prevent hydration mismatches
  ssrMode: isSSR,
});

export default client;
