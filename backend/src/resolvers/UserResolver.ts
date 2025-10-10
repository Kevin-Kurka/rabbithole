import { Resolver, Query, Mutation, Arg, Ctx, PubSub, Subscription, Root } from 'type-graphql';
import { User } from '../entities/User';
import { UserInput } from './UserInput';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';

@Resolver(User)
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: { req: any }): Promise<User | null> {
    // You would have a session management system to get the user id
    return null;
  }

  @Mutation(() => User)
  async register(
    @Arg("input") { username, email, password }: UserInput,
    @Ctx() { pool, pubSub }: { pool: Pool, pubSub: PubSubEngine }
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO public."Users" (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [username, email, hashedPassword]
    );
    const newUser = result.rows[0];
    await pubSub.publish("NEW_USER", newUser);
    return newUser;
  }

  @Mutation(() => User, { nullable: true })
  async login(
    @Arg("input") { email, password }: UserInput,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<User | null> {
    const result = await pool.query('SELECT * FROM public."Users" WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    return user;
  }

  @Subscription(() => User, {
    topics: "NEW_USER",
  })
  newUser(@Root() user: User): User {
    return user;
  }
}