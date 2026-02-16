import { Resolver, Query, Mutation, Arg, Ctx, PubSub, Subscription, Root, Field, ObjectType, ID } from 'type-graphql';
import { UserInput } from './UserInput';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

import { User } from '../types/GraphTypes';

@ObjectType()
class AuthResponse {
  @Field()
  user: User;

  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;
}

@Resolver(User)
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { userId, pool }: { userId: string | null, pool: Pool }): Promise<User | null> {
    if (!userId) {
      return null;
    }

    const result = await pool.query('SELECT * FROM public.nodes WHERE id = $1', [userId]);
    if (result.rows.length === 0) return null;

    return User.fromNode(result.rows[0]);
  }

  @Mutation(() => AuthResponse)
  async register(
    @Arg("input") { username, email, password }: UserInput,
    @Ctx() { pool, pubSub }: { pool: Pool, pubSub: PubSubEngine }
  ): Promise<AuthResponse> {
    // 1. Get User node type ID
    const typeResult = await pool.query('SELECT id FROM public.node_types WHERE name = $1', ['User']);
    if (typeResult.rows.length === 0) {
      throw new Error('User node type not found in schema');
    }
    const userTypeId = typeResult.rows[0].id;

    // 2. Check if user already exists
    const existing = await pool.query(
      `SELECT id FROM public.nodes 
       WHERE node_type_id = $1 
       AND (props->>'email' = $2 OR props->>'username' = $3)`,
      [userTypeId, email, username]
    );

    if (existing.rows.length > 0) {
      throw new Error('User with that email or username already exists');
    }

    // 3. Create new User node
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO public.nodes (id, node_type_id, props, created_at, updated_at) 
       VALUES ($1, $2, $3, NOW(), NOW()) 
       RETURNING *`,
      [
        userId,
        userTypeId,
        JSON.stringify({
          username,
          email,
          password_hash: hashedPassword,
          role: 'user'
        })
      ]
    );

    const newUserNode = result.rows[0];
    const newUser = User.fromNode(newUserNode);

    // 4. Generate JWT tokens
    const accessToken = generateAccessToken(newUser.id, newUser.username, newUser.email);
    const refreshToken = generateRefreshToken(newUser.id);

    await pubSub.publish("NEW_USER", newUser);

    return {
      user: newUser,
      accessToken,
      refreshToken,
    };
  }

  @Mutation(() => AuthResponse, { nullable: true })
  async login(
    @Arg("input") { email, password }: UserInput,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<AuthResponse | null> {
    // 1. Get User node type ID
    const typeResult = await pool.query('SELECT id FROM public.node_types WHERE name = $1', ['User']);
    if (typeResult.rows.length === 0) {
      throw new Error('User node type not found in schema');
    }
    const userTypeId = typeResult.rows[0].id;

    // 2. Find user by email
    const result = await pool.query(
      `SELECT * FROM public.nodes 
       WHERE node_type_id = $1 
       AND props->>'email' = $2`,
      [userTypeId, email]
    );

    const userNode = result.rows[0];

    if (!userNode) {
      throw new Error('Invalid email or password');
    }

    // 3. Verify password
    const props = typeof userNode.props === 'string' ? JSON.parse(userNode.props) : userNode.props;
    const isValid = await bcrypt.compare(password, props.password_hash);

    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const user = User.fromNode(userNode);

    // 4. Generate JWT tokens
    const accessToken = generateAccessToken(user.id, user.username, user.email);
    const refreshToken = generateRefreshToken(user.id);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  @Subscription(() => User, {
    topics: "NEW_USER",
  })
  newUser(@Root() user: User): User {
    return user;
  }
}