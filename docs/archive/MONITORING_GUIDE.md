# Monitoring Guide

## Overview

This guide explains how to monitor the Rabbit Hole platform in production.

---

## 1. Key Performance Indicators (KPIs)

### Backend Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Response Time (P95) | <200ms | >500ms | >1000ms |
| Error Rate | <1% | >2% | >5% |
| Cache Hit Rate | >80% | <70% | <50% |
| Database Query Time | <50ms | >100ms | >200ms |
| CPU Usage | <70% | >80% | >90% |
| Memory Usage | <80% | >85% | >90% |
| Disk Usage | <80% | >85% | >90% |

### Frontend Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Lighthouse Performance | >90 | <80 | <70 |
| First Contentful Paint | <1.5s | >2s | >3s |
| Largest Contentful Paint | <2.5s | >3s | >4s |
| Time to Interactive | <3s | >4s | >5s |
| Cumulative Layout Shift | <0.1 | >0.15 | >0.25 |
| Bundle Size (main) | <300KB | >350KB | >400KB |

---

## 2. Monitoring Tools

### Backend Monitoring

#### Redis Monitoring

**Check Redis health:**
```bash
redis-cli ping  # Should return PONG
redis-cli INFO stats
```

**Key metrics:**
```bash
# Cache hit rate
redis-cli INFO stats | grep keyspace

# Memory usage
redis-cli INFO memory | grep used_memory_human

# Connected clients
redis-cli INFO clients | grep connected_clients
```

**Cache statistics:**
```typescript
// In application
const stats = await cacheService.getCacheStats();
console.log('Hit Rate:', stats.hitRate);
console.log('Memory:', stats.memoryUsage);
```

#### Database Monitoring

**Check PostgreSQL health:**
```bash
psql -U user -d dbname -c "SELECT 1"
```

**Index usage:**
```sql
SELECT * FROM performance_index_usage
ORDER BY index_scans DESC
LIMIT 20;
```

**Slow queries:**
```sql
SELECT * FROM performance_slow_queries
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Active connections:**
```sql
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;
```

**Database size:**
```sql
SELECT pg_database_size('rabbithole_db') / 1024 / 1024 as size_mb;
```

#### Application Monitoring

**Performance test:**
```bash
cd /Users/kmk/rabbithole/backend
node test-performance.js
```

**Log monitoring:**
```bash
# Application logs
tail -f logs/application.log

# Error logs
tail -f logs/error.log | grep ERROR

# Performance logs
tail -f logs/performance.log
```

### Frontend Monitoring

#### Lighthouse Audit

```bash
cd /Users/kmk/rabbithole/frontend
npm install -g lighthouse
lighthouse http://localhost:3000 --view
```

**Or use npm script:**
```bash
node run-lighthouse.js
```

#### Bundle Analysis

```bash
ANALYZE=true npm run build
```

Opens interactive bundle visualization.

#### Performance Monitor

In development, press `Ctrl+Shift+P` to toggle performance monitor showing:
- Real-time FPS
- Memory usage
- Performance warnings

---

## 3. Monitoring Dashboard Setup

### Recommended Tools

1. **Application Monitoring:**
   - Prometheus + Grafana
   - New Relic
   - Datadog
   - AppDynamics

2. **Log Aggregation:**
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Splunk
   - Papertrail
   - Loggly

3. **Error Tracking:**
   - Sentry
   - Rollbar
   - Bugsnag
   - Airbrake

4. **Uptime Monitoring:**
   - Pingdom
   - UptimeRobot
   - StatusCake
   - Better Uptime

### Custom Dashboard Metrics

**Backend Metrics:**
```javascript
// Prometheus metrics example
const promClient = require('prom-client');

// Response time histogram
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000]
});

// Cache hit rate
const cacheHitRate = new promClient.Gauge({
  name: 'cache_hit_rate',
  help: 'Percentage of cache hits'
});

// Database query time
const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_ms',
  help: 'Duration of database queries in ms',
  labelNames: ['query_type'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000]
});
```

**Frontend Metrics:**
```javascript
// Google Analytics Web Vitals
export function reportToAnalytics(metric) {
  gtag('event', metric.name, {
    value: Math.round(metric.value),
    metric_id: metric.id,
    metric_value: metric.value,
    metric_rating: metric.rating,
  });
}
```

---

## 4. Alert Configuration

### Critical Alerts (Immediate Response)

1. **Service Down**
   - Health check fails
   - No response from server
   - Action: Investigate immediately

2. **High Error Rate (>5%)**
   - Database connection errors
   - GraphQL errors
   - Action: Check logs, rollback if needed

3. **Database Issues**
   - Connection pool exhausted
   - Deadlocks
   - Action: Scale database, optimize queries

4. **Memory Issues (>90%)**
   - Memory leak detected
   - OOM errors
   - Action: Restart service, investigate leak

### Warning Alerts (Review Soon)

1. **Slow Performance**
   - P95 response time >500ms
   - Action: Review slow queries, check cache

2. **Low Cache Hit Rate (<70%)**
   - Cache misconfiguration
   - Action: Review cache strategy

3. **High CPU (>80%)**
   - Inefficient queries
   - Action: Optimize code, scale horizontally

4. **Disk Space Low (>85%)**
   - Log files growing
   - Action: Clean logs, increase disk

### Info Alerts (Monitor)

1. **Increased Traffic**
   - Throughput rising
   - Action: Monitor capacity

2. **New Errors**
   - Previously unseen errors
   - Action: Review and fix

3. **Slow Queries**
   - Queries >100ms
   - Action: Add indexes, optimize

---

## 5. Monitoring Procedures

### Daily Checks

**Morning:**
- [ ] Check service status
- [ ] Review error count (should be <1%)
- [ ] Check cache hit rate (should be >80%)
- [ ] Review slow query log
- [ ] Check disk space

**Evening:**
- [ ] Review daily performance summary
- [ ] Check for anomalies
- [ ] Review user feedback
- [ ] Plan optimizations

### Weekly Reviews

- [ ] Performance trend analysis
- [ ] Error pattern analysis
- [ ] Capacity planning review
- [ ] Database index review
- [ ] Bundle size review

### Monthly Reviews

- [ ] Comprehensive performance audit
- [ ] Run full load tests
- [ ] Review monitoring alerts
- [ ] Update optimization roadmap
- [ ] Team retrospective

---

## 6. Troubleshooting Guide

### Slow Performance

**Symptoms:**
- Response times increasing
- Users reporting slowness

**Investigation:**
```bash
# Check database
SELECT * FROM performance_slow_queries;

# Check cache
redis-cli INFO stats

# Check server load
top
htop

# Check network
ping api.server.com
traceroute api.server.com
```

**Solutions:**
- Add missing indexes
- Optimize slow queries
- Increase cache TTL
- Scale horizontally
- Add database replicas

### High Memory Usage

**Symptoms:**
- Memory usage >85%
- OOM errors
- Slow garbage collection

**Investigation:**
```bash
# Check memory
free -m
ps aux --sort=-%mem | head

# Node.js memory
node --max-old-space-size=4096 dist/index.js
```

**Solutions:**
- Find memory leaks
- Increase server memory
- Optimize large queries
- Implement pagination
- Clear unused caches

### Database Issues

**Symptoms:**
- Slow queries
- Connection errors
- Deadlocks

**Investigation:**
```sql
-- Active queries
SELECT * FROM pg_stat_activity;

-- Blocking queries
SELECT * FROM pg_stat_activity WHERE wait_event IS NOT NULL;

-- Table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public' AND n_distinct > 100;
```

**Solutions:**
- Add indexes
- Optimize queries
- Increase connection pool
- Vacuum tables
- Upgrade database

### Cache Issues

**Symptoms:**
- Low hit rate
- Slow response times
- High database load

**Investigation:**
```bash
# Cache stats
redis-cli INFO stats

# Check keys
redis-cli KEYS *

# Check memory
redis-cli INFO memory
```

**Solutions:**
- Increase cache TTL
- Pre-warm cache
- Fix invalidation logic
- Increase Redis memory
- Add cache layer

---

## 7. Performance Baseline

### Baseline Metrics (After Optimizations)

**Backend:**
- Response Time P50: 38ms
- Response Time P95: 124ms
- Response Time P99: 287ms
- Error Rate: 0.49%
- Throughput: 109 req/s
- Cache Hit Rate: 85%

**Frontend:**
- Lighthouse Performance: 92
- FCP: 1.3s
- LCP: 2.7s
- CLS: 0.08
- TTI: 2.7s
- Bundle Size: 276KB

**Database:**
- Average Query Time: 38ms
- Connection Pool: 20 connections
- Active Queries: <10

### Regression Detection

If metrics deviate by:
- **>10%:** Investigate
- **>25%:** Alert team
- **>50%:** Critical issue

---

## 8. Monitoring Checklist

### Setup
- [ ] Application monitoring installed
- [ ] Database monitoring configured
- [ ] Cache monitoring enabled
- [ ] Error tracking integrated
- [ ] Log aggregation set up
- [ ] Uptime monitoring active
- [ ] Alerts configured
- [ ] Dashboard created

### Daily Operations
- [ ] Check service health
- [ ] Review error logs
- [ ] Monitor performance metrics
- [ ] Check cache statistics
- [ ] Review slow queries
- [ ] Monitor disk space

### Optimization
- [ ] Run weekly performance tests
- [ ] Review monthly metrics
- [ ] Update performance baseline
- [ ] Optimize slow queries
- [ ] Review bundle sizes
- [ ] Plan capacity upgrades

---

## 9. Contact Information

### On-Call Rotation
- **Primary:** [Name/Phone/Slack]
- **Secondary:** [Name/Phone/Slack]
- **Escalation:** [Name/Phone/Slack]

### Service Status Page
- URL: [Your status page]
- Update frequency: Real-time
- Historical data: 90 days

### Documentation
- Runbooks: [URL]
- Architecture: [URL]
- API Docs: [URL]
- Deployment Guide: [URL]

---

## 10. Resources

### Monitoring Queries

**Backend:**
```sql
-- Most expensive queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;

-- Cache hit ratio
SELECT sum(heap_blks_read) as heap_read,
       sum(heap_blks_hit) as heap_hit,
       sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
```

**Redis:**
```bash
# Memory usage by key pattern
redis-cli --bigkeys

# Slow operations
redis-cli SLOWLOG GET 10

# Monitor commands in real-time
redis-cli MONITOR
```

### Useful Commands

```bash
# CPU usage
mpstat 1 10

# Memory usage
vmstat 1 10

# Disk I/O
iostat -x 1 10

# Network
iftop
nethogs

# Process monitoring
pidstat 1 10

# Application logs
journalctl -u app-name -f
```

---

For questions or support, contact the platform team.
