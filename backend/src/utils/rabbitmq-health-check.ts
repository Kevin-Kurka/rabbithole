/**
 * RabbitMQ Health Check Utility
 *
 * Simple script to verify RabbitMQ connection and queue status.
 * Usage: ts-node src/utils/rabbitmq-health-check.ts
 */

import { connect, ChannelModel, Channel } from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';
const QUEUE_NAME = process.env.VECTORIZATION_QUEUE_NAME || 'vectorization_queue';

async function checkRabbitMQHealth(): Promise<void> {
  console.log('🔍 Checking RabbitMQ connection...\n');
  console.log(`URL: ${RABBITMQ_URL.replace(/\/\/.*@/, '//***:***@')}`);
  console.log(`Queue: ${QUEUE_NAME}\n`);

  let connection: ChannelModel | null = null;
  let channel: Channel | null = null;

  try {
    // Connect to RabbitMQ
    console.log('Connecting to RabbitMQ...');
    connection = await connect(RABBITMQ_URL);
    console.log('✅ Connection established\n');

    // Create channel
    channel = await connection.createChannel();
    console.log('✅ Channel created\n');

    // Assert queue exists
    const queueInfo = await channel.assertQueue(QUEUE_NAME, {
      durable: true,
      autoDelete: false,
    });

    console.log('📊 Queue Status:');
    console.log(`   Name: ${QUEUE_NAME}`);
    console.log(`   Messages: ${queueInfo.messageCount}`);
    console.log(`   Consumers: ${queueInfo.consumerCount}`);
    console.log('');

    // Check for messages
    if (queueInfo.messageCount > 0) {
      console.log(`⚠️  ${queueInfo.messageCount} messages waiting in queue`);
    } else {
      console.log('✅ Queue is empty');
    }

    // Check for consumers
    if (queueInfo.consumerCount > 0) {
      console.log(`✅ ${queueInfo.consumerCount} worker(s) connected`);
    } else {
      console.log('⚠️  No workers connected to queue');
    }

    console.log('\n✅ RabbitMQ health check passed!');
    console.log('\nNext steps:');
    console.log('  1. View RabbitMQ Management UI: http://localhost:15672');
    console.log('  2. Start worker: npm run worker:dev');
    console.log('  3. Monitor logs: docker-compose logs -f vectorization-worker\n');

  } catch (error) {
    console.error('\n❌ RabbitMQ health check failed!\n');

    if (error instanceof Error) {
      console.error(`Error: ${error.message}\n`);

      if (error.message.includes('ECONNREFUSED')) {
        console.error('Troubleshooting:');
        console.error('  1. Check if RabbitMQ is running:');
        console.error('     docker ps | grep rabbitmq');
        console.error('  2. Start RabbitMQ:');
        console.error('     docker-compose up -d rabbitmq');
        console.error('  3. Verify connection URL in .env file\n');
      } else if (error.message.includes('ACCESS_REFUSED')) {
        console.error('Troubleshooting:');
        console.error('  1. Check RabbitMQ credentials in .env');
        console.error('  2. Default credentials: admin/admin');
        console.error('  3. Reset RabbitMQ:');
        console.error('     docker-compose restart rabbitmq\n');
      }
    } else {
      console.error(error);
    }

    process.exit(1);
  } finally {
    // Clean up
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
  }
}

// Run health check
checkRabbitMQHealth().catch(console.error);
