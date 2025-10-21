# Deployment Guide

This document describes how to deploy Project Rabbit Hole to production and staging environments.

## Prerequisites

- AWS Account with ECS, RDS, and ElastiCache
- Docker Hub account (or AWS ECR)
- GitHub repository with Actions enabled
- Domain name and SSL certificates

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

### Docker Registry
```
DOCKER_USERNAME=your_docker_username
DOCKER_PASSWORD=your_docker_password_or_token
```

### AWS Credentials (Staging)
```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

### AWS Credentials (Production)
```
AWS_ACCESS_KEY_ID_PROD=AKIA...
AWS_SECRET_ACCESS_KEY_PROD=...
```

### Code Coverage
```
CODECOV_TOKEN=your_codecov_token
```

### Notifications
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## Infrastructure Setup

### 1. Database (RDS PostgreSQL with pgvector)

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier rabbithole-production \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 14.9 \
  --master-username postgres \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 100 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxx \
  --db-subnet-group-name rabbithole-db-subnet \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:04:00-sun:05:00" \
  --enable-iam-database-authentication \
  --publicly-accessible false

# Install pgvector extension (connect to database first)
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Redis (ElastiCache)

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id rabbithole-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name rabbithole-cache-subnet \
  --security-group-ids sg-xxx \
  --preferred-maintenance-window "sun:05:00-sun:06:00"
```

### 3. RabbitMQ (Amazon MQ)

```bash
aws mq create-broker \
  --broker-name rabbithole-rabbitmq \
  --engine-type RABBITMQ \
  --engine-version 3.11 \
  --host-instance-type mq.t3.micro \
  --deployment-mode SINGLE_INSTANCE \
  --users "Username=admin,Password=YOUR_SECURE_PASSWORD" \
  --subnet-ids subnet-xxx \
  --security-groups sg-xxx \
  --publicly-accessible false
```

### 4. ECS Cluster

```bash
# Create ECS cluster
aws ecs create-cluster \
  --cluster-name rabbithole-production \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1 \
    capacityProvider=FARGATE_SPOT,weight=4

# Create log group
aws logs create-log-group \
  --log-group-name /ecs/rabbithole-api
```

### 5. Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name rabbithole-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4

# Create target group
aws elbv2 create-target-group \
  --name rabbithole-api-tg \
  --protocol HTTP \
  --port 4000 \
  --vpc-id vpc-xxx \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:... \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

### 6. ECS Service

```bash
# Create ECS service
aws ecs create-service \
  --cluster rabbithole-production \
  --service-name api-service \
  --task-definition rabbithole-api:1 \
  --desired-count 3 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-xxx,subnet-yyy],
    securityGroups=[sg-xxx],
    assignPublicIp=DISABLED
  }" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=api,containerPort=4000" \
  --health-check-grace-period-seconds 60 \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100,deploymentCircuitBreaker={enable=true,rollback=true}"
```

### 7. Secrets Manager

```bash
# Store secrets
aws secretsmanager create-secret \
  --name rabbithole/database-url \
  --secret-string "postgresql://postgres:PASSWORD@rabbithole-production.xxx.rds.amazonaws.com:5432/rabbithole_db"

aws secretsmanager create-secret \
  --name rabbithole/redis-url \
  --secret-string "redis://rabbithole-redis.xxx.cache.amazonaws.com:6379"

aws secretsmanager create-secret \
  --name rabbithole/rabbitmq-url \
  --secret-string "amqps://admin:PASSWORD@b-xxx.mq.us-east-1.amazonaws.com:5671"

aws secretsmanager create-secret \
  --name rabbithole/openai-key \
  --secret-string "sk-..."

aws secretsmanager create-secret \
  --name rabbithole/jwt-secret \
  --secret-string "$(openssl rand -base64 32)"
```

## Environment Configuration

### Staging Environment

- **URL**: https://staging.rabbithole.app
- **Branch**: `develop`
- **Deployment**: Automatic on push
- **Database**: Small RDS instance (db.t3.small)
- **Replicas**: 1 ECS task
- **Resources**: 0.5 vCPU, 1GB RAM

### Production Environment

- **URL**: https://rabbithole.app
- **Branch**: `main`
- **Deployment**: Automatic with approval gate
- **Database**: Production RDS (db.t3.medium+)
- **Replicas**: 3+ ECS tasks
- **Resources**: 1 vCPU, 2GB RAM per task

## Deployment Process

### Automatic Deployment (via GitHub Actions)

1. **Code Changes**
   ```bash
   git checkout -b feature/my-feature
   # Make changes
   git commit -m "feat(api): add new feature"
   git push origin feature/my-feature
   ```

2. **Create Pull Request**
   - PR triggers test and lint workflows
   - Coverage report is generated
   - PR checks must pass before merge

3. **Merge to Develop (Staging)**
   ```bash
   # After PR approval
   git checkout develop
   git merge feature/my-feature
   git push origin develop
   ```
   - Automatically deploys to staging
   - Runs smoke tests
   - Notifications sent to Slack

4. **Merge to Main (Production)**
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```
   - Creates database backup
   - Blue-green deployment to production
   - Runs smoke tests
   - Automatic rollback on failure
   - Notifications sent to Slack

### Manual Deployment

```bash
# Trigger workflow manually
gh workflow run deploy.yml \
  --ref main \
  -f environment=production
```

## Database Migrations

### During Deployment

Migrations run automatically as part of the deployment workflow:

```bash
# ECS task runs migrations before service update
aws ecs run-task \
  --cluster rabbithole-production \
  --task-definition rabbithole-migrations \
  --launch-type FARGATE
```

### Manual Migration

```bash
# Connect to ECS task
aws ecs execute-command \
  --cluster rabbithole-production \
  --task TASK_ID \
  --container api \
  --interactive \
  --command "/bin/bash"

# Inside container
psql $DATABASE_URL < migrations/001_add_new_feature.sql
```

## Rollback Procedures

### Automatic Rollback

The deployment workflow automatically rolls back on failure:
- Health check failures
- Smoke test failures
- CloudWatch alarm triggers

### Manual Rollback

```bash
# 1. Find previous task definition
aws ecs describe-services \
  --cluster rabbithole-production \
  --services api-service \
  --query 'services[0].deployments'

# 2. Update service with previous task definition
aws ecs update-service \
  --cluster rabbithole-production \
  --service api-service \
  --task-definition rabbithole-api:PREVIOUS_REVISION \
  --force-new-deployment

# 3. Restore database from backup (if needed)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier rabbithole-production-restored \
  --db-snapshot-identifier rabbithole-backup-TIMESTAMP
```

## Monitoring

### CloudWatch Dashboards

- **API Metrics**: Request count, latency, error rate
- **Database**: Connection count, CPU, storage
- **Cache**: Hit rate, memory usage
- **ECS**: Task count, CPU, memory

### Alarms

```bash
# Create CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name rabbithole-api-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=ServiceName,Value=api-service Name=ClusterName,Value=rabbithole-production \
  --alarm-actions arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:alerts
```

### Log Analysis

```bash
# View recent logs
aws logs tail /ecs/rabbithole-api --follow

# Search for errors
aws logs filter-log-events \
  --log-group-name /ecs/rabbithole-api \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

## Troubleshooting

### Deployment Failures

1. **Check ECS service events**
   ```bash
   aws ecs describe-services \
     --cluster rabbithole-production \
     --services api-service \
     --query 'services[0].events[:10]'
   ```

2. **Check task logs**
   ```bash
   aws logs tail /ecs/rabbithole-api --follow
   ```

3. **Verify secrets**
   ```bash
   aws secretsmanager list-secrets \
     --filters Key=name,Values=rabbithole/
   ```

### Database Connection Issues

1. **Check security groups**
   ```bash
   aws ec2 describe-security-groups \
     --group-ids sg-xxx
   ```

2. **Test connection from ECS task**
   ```bash
   # Execute command in running task
   aws ecs execute-command \
     --cluster rabbithole-production \
     --task TASK_ID \
     --container api \
     --interactive \
     --command "psql $DATABASE_URL -c 'SELECT 1'"
   ```

### Performance Issues

1. **Scale out ECS service**
   ```bash
   aws ecs update-service \
     --cluster rabbithole-production \
     --service api-service \
     --desired-count 5
   ```

2. **Enable auto-scaling**
   ```bash
   aws application-autoscaling register-scalable-target \
     --service-namespace ecs \
     --resource-id service/rabbithole-production/api-service \
     --scalable-dimension ecs:service:DesiredCount \
     --min-capacity 3 \
     --max-capacity 10

   aws application-autoscaling put-scaling-policy \
     --service-namespace ecs \
     --resource-id service/rabbithole-production/api-service \
     --scalable-dimension ecs:service:DesiredCount \
     --policy-name cpu-scaling \
     --policy-type TargetTrackingScaling \
     --target-tracking-scaling-policy-configuration file://scaling-policy.json
   ```

## Security Best Practices

1. **Never commit secrets** - Use Secrets Manager
2. **Enable encryption** - RDS, ElastiCache, ECS task storage
3. **Use IAM roles** - Avoid access keys when possible
4. **Enable VPC Flow Logs** - Monitor network traffic
5. **Regular updates** - Keep dependencies and base images updated
6. **Enable WAF** - Protect against common attacks
7. **Backup regularly** - Automated daily backups with retention

## Cost Optimization

1. **Use Fargate Spot** - 70% cost savings for non-critical tasks
2. **RDS Reserved Instances** - Up to 60% savings
3. **S3 Lifecycle Policies** - Move old data to cheaper storage tiers
4. **CloudWatch Log Retention** - Delete old logs after 30 days
5. **Right-size instances** - Monitor and adjust based on usage

## Support

For deployment issues:
1. Check GitHub Actions logs
2. Review CloudWatch logs
3. Check AWS service health dashboard
4. Contact DevOps team via Slack #infrastructure
