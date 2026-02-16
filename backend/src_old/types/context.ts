import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { Redis } from 'ioredis';
import { NotificationService } from '../services/NotificationService';

export interface Context {
  pool: Pool;
  pubSub?: PubSubEngine;
  redis?: Redis;
  userId?: string;
  notificationService?: NotificationService;
}
