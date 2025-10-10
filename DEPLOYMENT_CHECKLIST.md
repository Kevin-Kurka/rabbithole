# Deployment Checklist

## Pre-Deployment

### Code Quality
- [ ] All tests passing (`npm test` / `jest`)
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code review completed
- [ ] All PRs merged to main branch

### Performance
- [ ] Run performance tests (`node backend/test-performance.js`)
- [ ] Bundle size under 300KB (`ANALYZE=true npm run build`)
- [ ] Lighthouse score >90
- [ ] Database indexes installed (`009_performance_indexes.sql`)
- [ ] Cache service configured

### Security
- [ ] Environment variables configured
- [ ] Secrets not in code
- [ ] HTTPS enabled
- [ ] Rate limiting configured
- [ ] CORS configured correctly
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified

### Database
- [ ] All migrations run
- [ ] Backup created
- [ ] Connection pooling configured
- [ ] Indexes verified (`SELECT * FROM performance_index_usage`)
- [ ] Query performance tested

### Infrastructure
- [ ] Redis server running
- [ ] PostgreSQL server running
- [ ] S3/storage configured (if using file uploads)
- [ ] Monitoring configured
- [ ] Logging configured
- [ ] SSL certificates valid

---

## Deployment Steps

### 1. Backend Deployment

```bash
# Navigate to backend
cd /Users/kmk/rabbithole/backend

# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Run database migrations
psql -U user -d rabbithole_db -f migrations/009_performance_indexes.sql

# Set environment variables
export DATABASE_URL="postgresql://..."
export REDIS_HOST="..."
export REDIS_PORT="6379"
export PORT="4000"

# Start server
npm start
```

### 2. Frontend Deployment

```bash
# Navigate to frontend
cd /Users/kmk/rabbithole/frontend

# Install dependencies
npm install --production

# Build production bundle
npm run build

# Start production server
npm start
```

### 3. Verify Deployment

- [ ] Health check endpoint responding (`GET /health`)
- [ ] GraphQL endpoint responding (`POST /graphql`)
- [ ] Frontend loading correctly
- [ ] Database connection working
- [ ] Redis connection working
- [ ] File uploads working (if applicable)

---

## Post-Deployment

### Monitoring
- [ ] Set up error alerts
- [ ] Monitor response times
- [ ] Check cache hit rates
- [ ] Review error logs
- [ ] Monitor memory usage
- [ ] Monitor CPU usage

### Performance Validation
- [ ] Run smoke tests
- [ ] Check Core Web Vitals
- [ ] Verify bundle sizes
- [ ] Test critical user flows
- [ ] Check database query performance

### Rollback Plan
- [ ] Database backup available
- [ ] Previous version tagged in git
- [ ] Rollback procedure documented
- [ ] Team notified of deployment

---

## Environment Variables

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=4000
NODE_ENV=production

# File Storage (optional)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=...

# Authentication (if applicable)
JWT_SECRET=...
SESSION_SECRET=...
```

### Frontend (.env.local)
```bash
# API
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
NEXT_PUBLIC_GRAPHQL_WS_URL=ws://localhost:4000/graphql

# Environment
NODE_ENV=production

# Analytics (optional)
NEXT_PUBLIC_GA_ID=...
```

---

## Troubleshooting

### Backend Issues

**Server won't start:**
- Check DATABASE_URL is correct
- Verify Redis is running: `redis-cli ping`
- Check PostgreSQL is running: `psql -U user -d dbname -c "SELECT 1"`
- Review logs: `tail -f logs/error.log`

**Slow performance:**
- Check cache hit rate: `redis-cli INFO stats`
- Review slow queries: `SELECT * FROM performance_slow_queries`
- Monitor memory: `free -m`
- Check CPU: `top`

**Database errors:**
- Verify migrations ran: `SELECT * FROM schema_migrations`
- Check connection pool: `SELECT count(*) FROM pg_stat_activity`
- Review query plans: `EXPLAIN ANALYZE ...`

### Frontend Issues

**Build fails:**
- Clear cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript errors: `tsc --noEmit`

**Slow loading:**
- Analyze bundle: `ANALYZE=true npm run build`
- Check network tab in dev tools
- Verify CDN/caching headers
- Run Lighthouse audit

**Runtime errors:**
- Check browser console
- Review error boundary logs
- Verify API endpoints
- Check CORS configuration

---

## Rollback Procedure

If issues occur:

1. **Stop Services**
   ```bash
   pm2 stop all  # or your process manager
   ```

2. **Restore Database** (if migrations ran)
   ```bash
   psql -U user -d dbname < backup.sql
   ```

3. **Deploy Previous Version**
   ```bash
   git checkout <previous-tag>
   npm install
   npm run build
   npm start
   ```

4. **Verify Rollback**
   - Test critical flows
   - Check error rates
   - Monitor performance

5. **Notify Team**
   - Document issues
   - Plan fix
   - Schedule redeployment

---

## Success Criteria

Deployment is successful when:
- [ ] All health checks passing
- [ ] Error rate <1%
- [ ] Response time P95 <200ms
- [ ] Cache hit rate >80%
- [ ] Lighthouse score >90
- [ ] No critical errors in logs
- [ ] User flows working correctly

---

## Support Contacts

- **Technical Lead:** [Name/Email]
- **DevOps:** [Name/Email]
- **Database Admin:** [Name/Email]
- **On-Call:** [Phone/Slack]

---

## Post-Deployment Monitoring

### First 24 Hours
- Monitor error rates every hour
- Check performance metrics every 2 hours
- Review user feedback
- Watch for anomalies

### First Week
- Daily performance reviews
- Weekly error analysis
- User feedback review
- Optimization opportunities

### Ongoing
- Weekly performance reports
- Monthly capacity planning
- Quarterly optimization review
- Continuous improvement
