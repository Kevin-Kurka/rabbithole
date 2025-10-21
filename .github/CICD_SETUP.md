# CI/CD Setup Guide

Complete guide for setting up the Continuous Integration and Continuous Deployment pipeline for Project Rabbit Hole.

## Overview

The CI/CD pipeline consists of four main workflows:

1. **Test Suite** - Automated testing with coverage reporting
2. **Lint & Type Check** - Code quality and security checks
3. **Coverage Report** - Detailed test coverage analysis
4. **Deploy** - Automated deployment to staging and production
5. **PR Checks** - Pull request validation and metadata

## Quick Setup Checklist

- [ ] Enable GitHub Actions in repository settings
- [ ] Configure required secrets
- [ ] Set up Docker Hub or ECR registry
- [ ] Configure AWS infrastructure
- [ ] Set up Codecov account
- [ ] Configure Slack webhooks (optional)
- [ ] Test workflows with a sample PR

## GitHub Actions Configuration

### 1. Enable GitHub Actions

1. Go to repository **Settings** → **Actions** → **General**
2. Enable "Allow all actions and reusable workflows"
3. Set workflow permissions to "Read and write permissions"
4. Enable "Allow GitHub Actions to create and approve pull requests"

### 2. Configure Secrets

Navigate to **Settings** → **Secrets and variables** → **Actions**

#### Required Secrets

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `DOCKER_USERNAME` | Docker Hub username | Your Docker Hub account |
| `DOCKER_PASSWORD` | Docker Hub token | Docker Hub → Account Settings → Security |
| `AWS_ACCESS_KEY_ID` | AWS access key (staging) | AWS IAM Console |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key (staging) | AWS IAM Console |
| `AWS_ACCESS_KEY_ID_PROD` | AWS access key (production) | AWS IAM Console |
| `AWS_SECRET_ACCESS_KEY_PROD` | AWS secret key (production) | AWS IAM Console |
| `CODECOV_TOKEN` | Codecov upload token | codecov.io → Repo Settings |

#### Optional Secrets

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `SLACK_WEBHOOK_URL` | Slack notification webhook | Slack → Incoming Webhooks |
| `SENTRY_DSN` | Sentry error tracking DSN | sentry.io → Project Settings |

### 3. Configure Variables

Navigate to **Settings** → **Secrets and variables** → **Actions** → **Variables**

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `ECR_REGISTRY` | `123456789.dkr.ecr.us-east-1.amazonaws.com` | AWS ECR registry URL |
| `ECS_CLUSTER_STAGING` | `rabbithole-staging` | Staging ECS cluster name |
| `ECS_CLUSTER_PROD` | `rabbithole-production` | Production ECS cluster name |
| `ECS_SERVICE_NAME` | `api-service` | ECS service name |

## Docker Registry Setup

### Option 1: Docker Hub

1. Create account at https://hub.docker.com
2. Create repository: `rabbithole-api`
3. Create repository: `rabbithole-frontend`
4. Generate access token:
   - Settings → Security → New Access Token
   - Copy token to `DOCKER_PASSWORD` secret

### Option 2: AWS ECR

```bash
# Create ECR repositories
aws ecr create-repository --repository-name rabbithole-api
aws ecr create-repository --repository-name rabbithole-frontend

# Get registry URL
aws ecr describe-repositories --query 'repositories[*].repositoryUri'

# Update workflows to use ECR instead of Docker Hub
```

## AWS Setup

### 1. Create IAM User for CI/CD

```bash
# Create IAM policy
cat > cicd-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTasks",
        "ecs:RunTask",
        "ecs:RegisterTaskDefinition",
        "ecs:ListTasks"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "rds:CreateDBSnapshot",
        "rds:DescribeDBSnapshots"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "cloudwatch:GetMetricData"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:PassRole"
      ],
      "Resource": "arn:aws:iam::*:role/ecsTaskExecutionRole"
    }
  ]
}
EOF

# Create policy
aws iam create-policy \
  --policy-name RabbitholeCICDPolicy \
  --policy-document file://cicd-policy.json

# Create IAM user
aws iam create-user --user-name rabbithole-cicd-staging
aws iam create-user --user-name rabbithole-cicd-production

# Attach policy
aws iam attach-user-policy \
  --user-name rabbithole-cicd-staging \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/RabbitholeCICDPolicy

aws iam attach-user-policy \
  --user-name rabbithole-cicd-production \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/RabbitholeCICDPolicy

# Create access keys
aws iam create-access-key --user-name rabbithole-cicd-staging
aws iam create-access-key --user-name rabbithole-cicd-production
```

### 2. Configure ECS Task Execution Role

```bash
# Create task execution role (if not exists)
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach AWS managed policy
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Add Secrets Manager access
cat > secrets-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "secretsmanager:GetSecretValue"
    ],
    "Resource": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:rabbithole/*"
  }]
}
EOF

aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name SecretsManagerAccess \
  --policy-document file://secrets-policy.json
```

## Codecov Setup

1. Go to https://codecov.io
2. Sign in with GitHub
3. Enable your repository
4. Copy the upload token
5. Add token to GitHub secrets as `CODECOV_TOKEN`

### Add Codecov Badge to README

```markdown
[![codecov](https://codecov.io/gh/YOUR_USERNAME/rabbithole/branch/main/graph/badge.svg?token=YOUR_TOKEN)](https://codecov.io/gh/YOUR_USERNAME/rabbithole)
```

## Slack Notifications Setup

1. Create Slack app: https://api.slack.com/apps
2. Enable Incoming Webhooks
3. Add webhook to workspace
4. Copy webhook URL
5. Add to GitHub secrets as `SLACK_WEBHOOK_URL`

### Customize Notification Message

Edit `.github/workflows/deploy.yml`:

```yaml
- name: Send Slack notification
  uses: slackapi/slack-github-action@v1.25.0
  with:
    payload: |
      {
        "text": "Deployment Status: ${{ job.status }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Deployment Complete*\n• Status: ${{ job.status }}\n• Commit: ${{ github.sha }}\n• Branch: ${{ github.ref_name }}"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Workflow Triggers

### Test Suite (`test.yml`)
- **Triggers**: Push to main/develop, all pull requests
- **Duration**: ~5-10 minutes
- **Failure Impact**: Blocks PR merge

### Lint & Type Check (`lint.yml`)
- **Triggers**: Push to main/develop, all pull requests
- **Duration**: ~3-5 minutes
- **Failure Impact**: Blocks PR merge

### Coverage Report (`coverage.yml`)
- **Triggers**: Push to main/develop, pull requests, weekly schedule
- **Duration**: ~5-10 minutes
- **Failure Impact**: Fails if coverage < 60%

### Deploy (`deploy.yml`)
- **Triggers**: Push to main (production), push to develop (staging), manual
- **Duration**: ~10-20 minutes
- **Failure Impact**: Automatic rollback

### PR Checks (`pr-checks.yml`)
- **Triggers**: All pull requests
- **Duration**: ~1-2 minutes
- **Failure Impact**: Warning only, doesn't block merge

## Testing Workflows

### Test Locally with Act

Install [act](https://github.com/nektos/act):

```bash
# Install act
brew install act

# List workflows
act -l

# Run specific workflow
act pull_request -W .github/workflows/test.yml

# Run with secrets
act -s DOCKER_USERNAME=myuser -s DOCKER_PASSWORD=mypass
```

### Test with Sample PR

1. Create test branch:
   ```bash
   git checkout -b test/ci-cd-setup
   echo "test" > test.txt
   git add test.txt
   git commit -m "test(ci): verify CI/CD pipeline"
   git push origin test/ci-cd-setup
   ```

2. Create pull request on GitHub

3. Monitor workflow runs:
   - Go to **Actions** tab
   - Click on running workflow
   - View logs for each job

4. Verify all checks pass:
   - Test Suite ✓
   - Lint & Type Check ✓
   - Coverage Report ✓
   - PR Checks ✓

## Monitoring Workflows

### GitHub Actions Dashboard

View workflow status:
```
https://github.com/YOUR_USERNAME/rabbithole/actions
```

### Workflow Status API

```bash
# Get workflow runs
gh run list --workflow=test.yml

# Get specific run details
gh run view RUN_ID

# View logs
gh run view RUN_ID --log

# Re-run failed workflow
gh run rerun RUN_ID
```

### Email Notifications

Configure in **Settings** → **Notifications**:
- Enable "Actions" notifications
- Choose email frequency

## Troubleshooting

### Common Issues

#### 1. Workflow doesn't trigger

**Problem**: Push to branch but workflow doesn't run

**Solution**:
- Check branch name matches workflow trigger
- Verify Actions are enabled in settings
- Check if workflow file has syntax errors

#### 2. Docker push fails

**Problem**: `unauthorized: authentication required`

**Solution**:
```bash
# Verify secrets are set correctly
gh secret list

# Test Docker login locally
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
```

#### 3. AWS deployment fails

**Problem**: `AccessDenied` or permission errors

**Solution**:
- Verify IAM user has required permissions
- Check ECS cluster and service names
- Ensure task execution role exists

#### 4. Tests fail in CI but pass locally

**Problem**: Tests pass locally but fail in GitHub Actions

**Solution**:
- Check service dependencies (PostgreSQL, Redis)
- Verify environment variables
- Review test logs in Actions tab
- Ensure database is properly initialized

#### 5. Coverage check fails

**Problem**: Coverage drops below threshold

**Solution**:
- Add tests for new code
- Review uncovered lines in Codecov report
- Adjust threshold in `jest.config.js` if justified

### Debug Mode

Enable debug logging in workflows:

```yaml
env:
  ACTIONS_RUNNER_DEBUG: true
  ACTIONS_STEP_DEBUG: true
```

### Manual Workflow Dispatch

Trigger workflow manually with custom parameters:

```bash
gh workflow run deploy.yml \
  --ref main \
  -f environment=production \
  -f skip_tests=false
```

## Best Practices

1. **Keep workflows fast** - Use caching, parallel jobs
2. **Fail fast** - Stop on first error
3. **Use matrix builds** - Test multiple Node versions
4. **Cache dependencies** - Speed up npm install
5. **Secure secrets** - Never log or expose secrets
6. **Monitor costs** - GitHub Actions minutes are limited
7. **Document changes** - Update this guide when modifying workflows

## Workflow Optimization

### Enable Caching

```yaml
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: |
      backend/node_modules
      frontend/node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### Use Concurrency Control

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### Optimize Docker Builds

```yaml
- name: Build with cache
  uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

## Security Considerations

1. **Minimize secret exposure** - Use secrets only where needed
2. **Rotate credentials** - Change keys regularly
3. **Audit access** - Review who can modify workflows
4. **Use OIDC** - Consider GitHub OIDC for AWS (no long-lived keys)
5. **Scan images** - Add container scanning to workflows

## Support

For CI/CD issues:
1. Check workflow logs in Actions tab
2. Review this documentation
3. Search GitHub Issues
4. Ask in #engineering Slack channel

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Codecov Documentation](https://docs.codecov.com/)
