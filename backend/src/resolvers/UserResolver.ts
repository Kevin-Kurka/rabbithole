import { Resolver, Query, Mutation, Arg, Ctx, PubSub, Subscription, Root, Field, ObjectType } from 'type-graphql';
import { User } from '../entities/User';
import { UserInput } from './UserInput';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth';

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

    const result = await pool.query('SELECT * FROM public."Users" WHERE id = $1', [userId]);
    return result.rows[0] || null;
  }

  @Mutation(() => AuthResponse)
  async register(
    @Arg("input") { username, email, password }: UserInput,
    @Ctx() { pool, pubSub }: { pool: Pool, pubSub: PubSubEngine }
  ): Promise<AuthResponse> {
    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM public."Users" WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing.rows.length > 0) {
      throw new Error('User with that email or username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO public."Users" (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [username, email, hashedPassword]
    );
    const newUser = result.rows[0];

    // Generate JWT tokens
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
    const result = await pool.query('SELECT * FROM public."Users" WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT tokens
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