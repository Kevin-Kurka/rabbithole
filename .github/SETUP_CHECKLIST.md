# CI/CD Setup Checklist

Use this checklist to set up the CI/CD pipeline for Project Rabbit Hole.

## Pre-Deployment Checklist

### 1. GitHub Repository Setup

- [ ] Repository created on GitHub
- [ ] GitHub Actions enabled in repository settings
- [ ] Branch protection rules configured for `main` and `develop`
- [ ] Required reviews before merge: 1
- [ ] Status checks required: test, lint, coverage

### 2. GitHub Secrets Configuration

Navigate to: **Repository Settings → Secrets and variables → Actions → New repository secret**

#### Required Secrets
- [ ] `DOCKER_USERNAME` - Your Docker Hub username
- [ ] `DOCKER_PASSWORD` - Docker Hub access token (from Docker Hub → Account Settings → Security)
- [ ] `AWS_ACCESS_KEY_ID` - AWS access key for staging environment
- [ ] `AWS_SECRET_ACCESS_KEY` - AWS secret key for staging environment
- [ ] `AWS_ACCESS_KEY_ID_PROD` - AWS access key for production environment
- [ ] `AWS_SECRET_ACCESS_KEY_PROD` - AWS secret key for production environment
- [ ] `CODECOV_TOKEN` - Token from codecov.io (after enabling repository)

#### Optional Secrets
- [ ] `SLACK_WEBHOOK_URL` - For deployment notifications
- [ ] `SENTRY_DSN` - For error tracking (future)

### 3. Docker Registry Setup

Choose one option:

#### Option A: Docker Hub
- [ ] Create Docker Hub account at https://hub.docker.com
- [ ] Create repository: `rabbithole-api`
- [ ] Create repository: `rabbithole-frontend`
- [ ] Generate access token (Settings → Security → New Access Token)
- [ ] Add credentials to GitHub secrets

#### Option B: AWS ECR
- [ ] Create ECR repositories:
  ```bash
  aws ecr create-repository --repository-name rabbithole-api
  aws ecr create-repository --repository-name rabbithole-frontend
  ```
- [ ] Update workflow files to use ECR instead of Docker Hub
- [ ] Configure IAM permissions for ECR access

### 4. AWS Infrastructure Setup

#### IAM Setup
- [ ] Create IAM policy for CI/CD (see CICD_SETUP.md)
- [ ] Create IAM users: `rabbithole-cicd-staging` and `rabbithole-cicd-production`
- [ ] Attach policy to users
- [ ] Create access keys for both users
- [ ] Add access keys to GitHub secrets
- [ ] Create ECS task execution role
- [ ] Attach AmazonECSTaskExecutionRolePolicy
- [ ] Add Secrets Manager permissions to execution role

#### Database Setup
- [ ] Create RDS PostgreSQL instance
- [ ] Apply security groups (allow ECS access)
- [ ] Install pgvector extension: `CREATE EXTENSION vector;`
- [ ] Run initial schema: `psql < init.sql`
- [ ] Create database backup schedule
- [ ] Store connection string in Secrets Manager

#### Redis Setup
- [ ] Create ElastiCache Redis cluster
- [ ] Apply security groups (allow ECS access)
- [ ] Store connection string in Secrets Manager

#### RabbitMQ Setup
- [ ] Create Amazon MQ broker (RabbitMQ)
- [ ] Apply security groups (allow ECS access)
- [ ] Store connection string in Secrets Manager

#### ECS Setup
- [ ] Create ECS cluster: `rabbithole-staging`
- [ ] Create ECS cluster: `rabbithole-production`
- [ ] Create CloudWatch log group: `/ecs/rabbithole-api`
- [ ] Create task definitions (use ecs-task-definition.json as template)
- [ ] Create ECS services
- [ ] Configure auto-scaling policies

#### Load Balancer Setup
- [ ] Create Application Load Balancer
- [ ] Create target groups (port 4000)
- [ ] Configure health checks (path: `/health`)
- [ ] Create HTTPS listener with SSL certificate
- [ ] Configure listener rules

#### Secrets Manager
- [ ] Store `rabbithole/database-url`
- [ ] Store `rabbithole/redis-url`
- [ ] Store `rabbithole/rabbitmq-url`
- [ ] Store `rabbithole/openai-key`
- [ ] Store `rabbithole/jwt-secret`
- [ ] Verify ECS task execution role can access secrets

### 5. Third-Party Services

#### Codecov
- [ ] Sign up at https://codecov.io with GitHub
- [ ] Enable repository in Codecov
- [ ] Copy upload token
- [ ] Add token to GitHub secrets as `CODECOV_TOKEN`
- [ ] Add badge to README.md

#### Slack (Optional)
- [ ] Create Slack app at https://api.slack.com/apps
- [ ] Enable Incoming Webhooks
- [ ] Add webhook to #deployments channel
- [ ] Copy webhook URL
- [ ] Add to GitHub secrets as `SLACK_WEBHOOK_URL`

### 6. Update Configuration Files

#### Update README.md Badges
```markdown
Replace YOUR_USERNAME with your actual GitHub username in:
- Test Suite badge URL
- Lint & Type Check badge URL
- Coverage Report badge URL
- Deploy badge URL
- Codecov badge URL
```

#### Update ecs-task-definition.json
- [ ] Replace `YOUR_ACCOUNT_ID` with AWS account ID
- [ ] Replace `YOUR_DOCKER_USERNAME` with Docker Hub username
- [ ] Update region if not using `us-east-1`
- [ ] Update secret ARNs

#### Update .github/workflows/deploy.yml
- [ ] Update cluster names if different
- [ ] Update service names if different
- [ ] Update region if not using `us-east-1`
- [ ] Configure subnet IDs and security group IDs
- [ ] Update health check URLs

### 7. Local Environment Setup

- [ ] Copy `.env.example` to `.env`
- [ ] Fill in environment variables
- [ ] Test local build: `docker-compose up --build`
- [ ] Verify all services start correctly
- [ ] Run tests locally: `cd backend && npm test`
- [ ] Verify database initialization

### 8. Test Workflows

#### Test with Sample PR
```bash
# Create test branch
git checkout -b test/ci-cd-verification
echo "CI/CD Test" > CI_CD_TEST.txt
git add CI_CD_TEST.txt
git commit -m "test(ci): verify CI/CD pipeline"
git push origin test/ci-cd-verification
```

- [ ] Create pull request
- [ ] Verify Test Suite workflow runs successfully
- [ ] Verify Lint & Type Check workflow passes
- [ ] Verify Coverage Report generates
- [ ] Verify PR Checks run
- [ ] Check coverage report comment on PR
- [ ] Verify PR auto-labels are applied

#### Test Deployment to Staging
```bash
# Merge to develop
git checkout develop
git merge test/ci-cd-verification
git push origin develop
```

- [ ] Verify Deploy workflow triggers
- [ ] Check Docker images are built and pushed
- [ ] Verify staging deployment completes
- [ ] Check staging application is accessible
- [ ] Review CloudWatch logs for errors
- [ ] Test staging endpoints

#### Test Deployment to Production (Dry Run)
```bash
# Merge to main (after verification)
git checkout main
git merge develop
git push origin main
```

- [ ] Verify Deploy workflow triggers
- [ ] Check database backup is created
- [ ] Verify blue-green deployment
- [ ] Check production application is accessible
- [ ] Verify smoke tests pass
- [ ] Check rollback works if needed

### 9. Security Verification

- [ ] Run security scan workflow
- [ ] Verify no critical/high vulnerabilities
- [ ] Check CodeQL results
- [ ] Verify secret scanning is active
- [ ] Review license compliance report
- [ ] Enable Dependabot alerts
- [ ] Enable GitHub Security advisories

### 10. Monitoring Setup

#### CloudWatch
- [ ] Create dashboard for API metrics
- [ ] Create dashboard for database metrics
- [ ] Set up CPU utilization alarm (>80%)
- [ ] Set up memory utilization alarm (>80%)
- [ ] Set up error rate alarm
- [ ] Set up latency alarm (p99 >1000ms)
- [ ] Configure SNS topic for alarms
- [ ] Test alarm notifications

#### Application Monitoring
- [ ] Verify CloudWatch Logs are collecting
- [ ] Set up log retention (30 days)
- [ ] Create metric filters for errors
- [ ] Create metric filters for security events
- [ ] Test log queries

### 11. Documentation

- [ ] Review README.md
- [ ] Update DEPLOYMENT.md with actual values
- [ ] Review CICD_SETUP.md
- [ ] Add team members to documentation
- [ ] Create runbook for common issues
- [ ] Document incident response procedures

### 12. Team Onboarding

- [ ] Share documentation with team
- [ ] Add team members to GitHub repository
- [ ] Configure branch protection rules
- [ ] Set up code review assignments
- [ ] Schedule CI/CD training session
- [ ] Create #deployments Slack channel
- [ ] Document on-call procedures

## Post-Deployment Verification

### Day 1
- [ ] Monitor all workflow runs
- [ ] Check error rates in CloudWatch
- [ ] Verify auto-scaling works
- [ ] Test rollback procedure
- [ ] Review security scan results

### Week 1
- [ ] Review deployment metrics
- [ ] Check test coverage trends
- [ ] Review CloudWatch costs
- [ ] Optimize workflow performance
- [ ] Update documentation with learnings

### Month 1
- [ ] Review CI/CD metrics
  - Workflow success rate (target: >95%)
  - Average workflow duration (target: <10 min)
  - Deployment frequency (target: daily)
  - Mean time to recovery (target: <30 min)
  - Change failure rate (target: <5%)
- [ ] Conduct security review
- [ ] Update dependencies
- [ ] Review and optimize costs
- [ ] Team retrospective on CI/CD

## Troubleshooting Checklist

If workflows fail, check:

- [ ] GitHub Actions are enabled
- [ ] All secrets are set correctly
- [ ] AWS credentials have required permissions
- [ ] ECS cluster and service names match workflow
- [ ] Docker registry is accessible
- [ ] Task execution role exists and has permissions
- [ ] Security groups allow required traffic
- [ ] Database is accessible from ECS
- [ ] Secrets Manager secrets exist
- [ ] CloudWatch log groups exist

## Success Criteria

The CI/CD pipeline is successfully set up when:

- [x] All 6 workflows are created and valid
- [x] README.md has status badges
- [x] All documentation is complete
- [ ] Test workflow passes on sample PR
- [ ] Lint workflow passes on sample PR
- [ ] Coverage workflow generates report
- [ ] PR checks validate pull request
- [ ] Security scan completes without critical issues
- [ ] Staging deployment succeeds
- [ ] Production deployment succeeds (test environment)
- [ ] Monitoring dashboards are functional
- [ ] Team is trained and onboarded

## Maintenance Schedule

### Daily
- [ ] Review failed workflow runs
- [ ] Check security scan results
- [ ] Monitor deployment metrics

### Weekly
- [ ] Review coverage trends
- [ ] Check for outdated dependencies
- [ ] Review CloudWatch alarms

### Monthly
- [ ] Update dependencies
- [ ] Review and optimize workflows
- [ ] Security audit
- [ ] Cost optimization review

### Quarterly
- [ ] Major dependency updates
- [ ] Infrastructure review
- [ ] Disaster recovery drill
- [ ] Team training session

---

**Last Updated**: 2025-10-10
**Status**: Ready for Implementation ✅
