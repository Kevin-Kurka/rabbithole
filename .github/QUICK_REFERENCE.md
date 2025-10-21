# CI/CD Quick Reference

Quick command reference for common CI/CD tasks in Project Rabbit Hole.

## GitHub CLI Commands

### Workflow Management

```bash
# List all workflows
gh workflow list

# View workflow runs
gh run list --workflow=test.yml

# View specific run details
gh run view <run-id>

# View run logs
gh run view <run-id> --log

# Re-run failed workflow
gh run rerun <run-id>

# Re-run specific job
gh run rerun <run-id> --job=<job-id>

# Watch workflow in real-time
gh run watch <run-id>

# Trigger manual workflow
gh workflow run deploy.yml --ref main -f environment=production

# Cancel workflow run
gh run cancel <run-id>

# Download workflow artifacts
gh run download <run-id>
```

### Repository Management

```bash
# View secrets
gh secret list

# Set secret
gh secret set DOCKER_PASSWORD < token.txt

# Delete secret
gh secret delete DOCKER_PASSWORD

# View environments
gh api repos/:owner/:repo/environments

# View Actions cache
gh cache list

# Delete specific cache
gh cache delete <cache-id>
```

### Pull Request Commands

```bash
# Create PR with template
gh pr create --title "feat(api): new feature" --body-file PR_TEMPLATE.md

# View PR checks
gh pr checks

# View PR diff
gh pr diff

# Merge PR after checks pass
gh pr merge --auto --squash

# View PR status
gh pr status
```

## Docker Commands

### Image Management

```bash
# Build image locally
docker build -t rabbithole-api:local ./backend

# Test image locally
docker run -p 4000:4000 --env-file .env rabbithole-api:local

# Push to Docker Hub
docker tag rabbithole-api:local username/rabbithole-api:latest
docker push username/rabbithole-api:latest

# Pull image from registry
docker pull username/rabbithole-api:latest

# Inspect image
docker image inspect username/rabbithole-api:latest

# Remove image
docker image rm username/rabbithole-api:latest

# Prune unused images
docker image prune -a
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Restart service
docker-compose restart api

# Stop all services
docker-compose down

# Remove volumes
docker-compose down -v

# Rebuild service
docker-compose up -d --build api
```

## AWS ECS Commands

### Service Management

```bash
# Update service (force new deployment)
aws ecs update-service \
  --cluster rabbithole-production \
  --service api-service \
  --force-new-deployment

# Scale service
aws ecs update-service \
  --cluster rabbithole-production \
  --service api-service \
  --desired-count 5

# View service status
aws ecs describe-services \
  --cluster rabbithole-production \
  --services api-service

# View running tasks
aws ecs list-tasks \
  --cluster rabbithole-production \
  --service-name api-service

# Stop task
aws ecs stop-task \
  --cluster rabbithole-production \
  --task <task-arn>
```

### Task Management

```bash
# Run one-off task (migrations)
aws ecs run-task \
  --cluster rabbithole-production \
  --task-definition rabbithole-migrations \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}"

# Execute command in running task
aws ecs execute-command \
  --cluster rabbithole-production \
  --task <task-id> \
  --container api \
  --interactive \
  --command "/bin/bash"

# View task logs
aws logs tail /ecs/rabbithole-api --follow

# Filter logs for errors
aws logs filter-log-events \
  --log-group-name /ecs/rabbithole-api \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

### Database Management

```bash
# Create snapshot
aws rds create-db-snapshot \
  --db-instance-identifier rabbithole-production \
  --db-snapshot-identifier backup-$(date +%Y%m%d-%H%M%S)

# List snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier rabbithole-production

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier rabbithole-production-restored \
  --db-snapshot-identifier <snapshot-id>
```

## Testing Commands

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- src/__tests__/level0-system.test.ts

# Run in watch mode
npm run test:watch

# Run verbose
npm run test:verbose

# Update snapshots
npm test -- -u
```

### Frontend Tests

```bash
cd frontend

# Run tests (when implemented)
npm test

# Run E2E tests (when implemented)
npm run test:e2e

# Run with coverage
npm run test:coverage
```

### Local Testing with Act

```bash
# Install act
brew install act

# List workflows
act -l

# Run pull_request workflows
act pull_request

# Run specific workflow
act pull_request -W .github/workflows/test.yml

# Run with secrets
act -s DOCKER_USERNAME=user -s DOCKER_PASSWORD=pass

# Dry run (show what would run)
act --dryrun

# Use specific platform
act --platform ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest
```

## Database Commands

### PostgreSQL

```bash
# Connect to database
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db

# Run SQL file
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < init.sql

# Backup database
docker exec rabbithole-postgres-1 pg_dump -U postgres rabbithole_db > backup.sql

# Restore database
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backup.sql

# List tables
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "\dt"

# Check vector extension
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

### Redis

```bash
# Connect to Redis
docker exec -it rabbithole-redis-1 redis-cli

# View all keys
docker exec -it rabbithole-redis-1 redis-cli KEYS "*"

# Flush all data
docker exec -it rabbithole-redis-1 redis-cli FLUSHALL

# Get specific key
docker exec -it rabbithole-redis-1 redis-cli GET key_name

# Monitor commands
docker exec -it rabbithole-redis-1 redis-cli MONITOR
```

### RabbitMQ

```bash
# List queues
docker exec rabbithole-rabbitmq rabbitmqctl list_queues

# List connections
docker exec rabbithole-rabbitmq rabbitmqctl list_connections

# Purge queue
docker exec rabbithole-rabbitmq rabbitmqctl purge_queue vectorization_queue

# Access management UI
# Open http://localhost:15672 (admin/admin)
```

## Monitoring Commands

### CloudWatch Logs

```bash
# Tail logs
aws logs tail /ecs/rabbithole-api --follow

# Get log groups
aws logs describe-log-groups --log-group-name-prefix /ecs/

# Get log streams
aws logs describe-log-streams \
  --log-group-name /ecs/rabbithole-api \
  --order-by LastEventTime \
  --descending

# Filter logs
aws logs filter-log-events \
  --log-group-name /ecs/rabbithole-api \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

### CloudWatch Metrics

```bash
# Get ECS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=api-service Name=ClusterName,Value=rabbithole-production \
  --start-time $(date -u -d '1 hour ago' --iso-8601) \
  --end-time $(date -u --iso-8601) \
  --period 300 \
  --statistics Average

# List alarms
aws cloudwatch describe-alarms

# Disable alarm
aws cloudwatch disable-alarm-actions --alarm-names rabbithole-high-cpu
```

## Security Commands

### npm Audit

```bash
# Run audit
npm audit

# Fix vulnerabilities
npm audit fix

# Fix with breaking changes
npm audit fix --force

# Audit production only
npm audit --production

# Audit JSON output
npm audit --json
```

### Docker Security Scan

```bash
# Scan with Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image rabbithole-api:latest

# Scan with Snyk
snyk container test rabbithole-api:latest

# Scan Dockerfile
hadolint backend/Dockerfile
```

## Git Commands for CI/CD

### Branch Management

```bash
# Create feature branch
git checkout -b feature/new-feature

# Push and set upstream
git push -u origin feature/new-feature

# Merge develop into feature
git checkout feature/new-feature
git merge develop

# Delete remote branch
git push origin --delete feature/old-feature
```

### Tagging for Releases

```bash
# Create tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push tag
git push origin v1.0.0

# List tags
git tag -l

# Delete tag
git tag -d v1.0.0
git push origin --delete v1.0.0
```

### Commit Message Format

```bash
# Feature
git commit -m "feat(api): add user authentication"

# Bug fix
git commit -m "fix(database): resolve connection pool leak"

# Documentation
git commit -m "docs(readme): update deployment instructions"

# Refactor
git commit -m "refactor(services): extract user service"

# Test
git commit -m "test(auth): add login flow tests"

# Chore
git commit -m "chore(deps): update dependencies"
```

## Deployment Commands

### Manual Deployment Trigger

```bash
# Deploy to staging
gh workflow run deploy.yml --ref develop -f environment=staging

# Deploy to production
gh workflow run deploy.yml --ref main -f environment=production

# Check deployment status
gh run watch $(gh run list --workflow=deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')
```

### Rollback

```bash
# Find previous task definition
aws ecs describe-services \
  --cluster rabbithole-production \
  --services api-service \
  --query 'services[0].deployments'

# Rollback to previous version
aws ecs update-service \
  --cluster rabbithole-production \
  --service api-service \
  --task-definition rabbithole-api:PREVIOUS_REVISION \
  --force-new-deployment
```

## Useful Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# GitHub CLI
alias ghw='gh workflow'
alias ghr='gh run'
alias ghp='gh pr'

# Docker
alias dc='docker-compose'
alias dcu='docker-compose up -d'
alias dcd='docker-compose down'
alias dcl='docker-compose logs -f'

# AWS
alias ecs-prod='aws ecs --cluster rabbithole-production'
alias ecs-stg='aws ecs --cluster rabbithole-staging'
alias logs-tail='aws logs tail /ecs/rabbithole-api --follow'

# Testing
alias test-backend='cd backend && npm test'
alias test-coverage='cd backend && npm run test:coverage'

# Git
alias gco='git checkout'
alias gcb='git checkout -b'
alias gp='git push'
alias gl='git pull'
```

## Environment-Specific Commands

### Staging

```bash
# Deploy to staging
git push origin develop

# View staging logs
aws logs tail /ecs/rabbithole-api --follow --filter-pattern staging

# Connect to staging database
psql postgresql://user:pass@staging-db.amazonaws.com:5432/rabbithole_db
```

### Production

```bash
# Deploy to production
git push origin main

# View production logs
aws logs tail /ecs/rabbithole-api --follow --filter-pattern production

# Create production snapshot
aws rds create-db-snapshot \
  --db-instance-identifier rabbithole-production \
  --db-snapshot-identifier prod-backup-$(date +%Y%m%d)
```

## Emergency Procedures

### Service Down

```bash
# 1. Check service status
aws ecs describe-services --cluster rabbithole-production --services api-service

# 2. View recent tasks
aws ecs list-tasks --cluster rabbithole-production --service-name api-service

# 3. Check task logs
aws logs tail /ecs/rabbithole-api --follow

# 4. Force new deployment
aws ecs update-service \
  --cluster rabbithole-production \
  --service api-service \
  --force-new-deployment
```

### Database Connection Issues

```bash
# 1. Check security group
aws ec2 describe-security-groups --group-ids sg-xxx

# 2. Check RDS status
aws rds describe-db-instances --db-instance-identifier rabbithole-production

# 3. Test connection from ECS task
aws ecs execute-command \
  --cluster rabbithole-production \
  --task <task-id> \
  --container api \
  --interactive \
  --command "psql $DATABASE_URL -c 'SELECT 1'"
```

### High CPU/Memory

```bash
# 1. Scale up immediately
aws ecs update-service \
  --cluster rabbithole-production \
  --service api-service \
  --desired-count 10

# 2. Check metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=api-service \
  --start-time $(date -u -d '1 hour ago' --iso-8601) \
  --end-time $(date -u --iso-8601) \
  --period 60 \
  --statistics Average,Maximum

# 3. View task details
aws ecs describe-tasks \
  --cluster rabbithole-production \
  --tasks $(aws ecs list-tasks --cluster rabbithole-production --service-name api-service --query 'taskArns[0]' --output text)
```

## Help and Documentation

```bash
# View GitHub Actions documentation
gh browse --settings actions

# View workflow syntax
gh workflow view test.yml

# View repository settings
gh browse --settings

# View deployment history
gh api repos/:owner/:repo/deployments

# View Actions usage
gh api /repos/:owner/:repo/actions/runs --paginate
```

---

For more detailed information, see:
- [CI/CD Setup Guide](.github/CICD_SETUP.md)
- [Deployment Guide](.github/DEPLOYMENT.md)
- [Implementation Summary](../CI_CD_IMPLEMENTATION.md)
