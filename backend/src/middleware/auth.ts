/**
 * Authentication Middleware
 *
 * Implements JWT-based authentication for the GraphQL API.
 * Generates tokens on login, validates on each request.
 */

import * as jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthContext {
  userId: string | null;
  isAuthenticated: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

/**
 * Generate access token
 */
export function generateAccessToken(userId: string, username: string, email: string): string {
  const options: any = {
    expiresIn: JWT_EXPIRES_IN
  };
  return jwt.sign(
    { userId, username, email },
    JWT_SECRET,
    options
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: string): string {
  const options: any = {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN
  };
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    options
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  // Support both "Bearer <token>" and just "<token>"
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }

  return null;
}

/**
 * Authentication middleware for Express
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req.headers.authorization as string);

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      (req as any).user = {
        id: payload.userId,
        username: payload.username,
        email: payload.email,
      };
      (req as any).userId = payload.userId;
    }
  }

  next();
}

/**
 * Get auth context for GraphQL resolvers
 */
export function getAuthContext(req: any): AuthContext {
  // Try JWT token first
  const token = extractToken(req.headers.authorization as string);

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      return {
        userId: payload.userId,
        isAuthenticated: true,
        user: {
          id: payload.userId,
          username: payload.username,
          email: payload.email,
        },
      };
    }
  }

  // Fallback to x-user-id header (for backwards compatibility during migration)
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    return {
      userId,
      isAuthenticated: true,
    };
  }

  return {
    userId: null,
    isAuthenticated: false,
  };
}

/**
 * Require authentication decorator for resolvers
 */
export function requireAuth(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const context = args[args.length - 1]; // Context is always last arg

    if (!context.userId) {
      throw new Error('Authentication required');
    }

    return originalMethod.apply(this, args);
  };

  return descriptor;
}

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  extractToken,
  authMiddleware,
  getAuthContext,
  requireAuth,
};
