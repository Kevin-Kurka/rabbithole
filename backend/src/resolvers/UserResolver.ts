import { Resolver, Query } from 'type-graphql';
import { User } from '../entities/User';

@Resolver(User)
export class UserResolver {
  @Query(() => User)
  me() {
    // Dummy user for now
    return {
      id: '1',
      username: 'testuser',
      email: 'test@test.com',
      createdAt: new Date(),
    };
  }
}
