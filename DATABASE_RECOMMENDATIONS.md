# Database Recommendations for Gameo

## Requirements
- Support **100,000 concurrent users**
- Fast read/write performance
- Scalable architecture
- Persistent storage for game data, user libraries, social features

## Recommended Architecture

### Primary Database: **PostgreSQL** (Recommended)

**Why PostgreSQL:**
- ✅ Excellent performance for high-concurrency workloads (with proper connection pooling)
- ✅ ACID compliance for data integrity
- ✅ Rich feature set (JSON support, full-text search, advanced indexing)
- ✅ Proven scalability (used by Instagram, Spotify, Reddit)
- ✅ Strong community and tooling
- ✅ Horizontal scaling options (read replicas, sharding)

**Configuration for 100k concurrent users:**
```sql
-- Connection pooling is critical
max_connections = 200
shared_buffers = 4GB (or 25% of RAM)
effective_cache_size = 12GB (or 75% of RAM)
work_mem = 16MB
maintenance_work_mem = 1GB
```

**Connection Pooling:**
- Use **PgBouncer** or **PgPool-II** for connection pooling
- Recommended pool size: 20-50 connections per application instance
- With 10 app instances: 200-500 total connections

**Scaling Strategy:**
1. **Vertical Scaling**: Start with powerful instance (16-32GB RAM, 8+ cores)
2. **Read Replicas**: Add 2-3 read replicas for read-heavy workloads
3. **Sharding**: Shard by user_id for horizontal scaling
4. **Caching Layer**: Redis for hot data (see below)

---

### Caching Layer: **Redis** (Required)

**Why Redis:**
- ✅ Extremely fast (in-memory, sub-millisecond latency)
- ✅ Perfect for session storage, real-time data
- ✅ Built-in expiration and eviction policies
- ✅ Can handle 100k+ concurrent connections
- ✅ Supports pub/sub for real-time features

**Use Cases:**
- Steam API response caching (7-day TTL)
- User session storage
- Hot game data (frequently accessed games)
- Friend activity feeds
- Rate limiting counters

**Configuration:**
- Redis Cluster for high availability
- Persistence: AOF (Append Only File) + RDB snapshots
- Memory: 16-32GB depending on cache size
- Replication: Master-slave with automatic failover

---

### Alternative: **MongoDB** (If you prefer NoSQL)

**Why MongoDB:**
- ✅ Document-based (good for game metadata)
- ✅ Horizontal scaling built-in (sharding)
- ✅ Flexible schema (good for evolving game data)
- ✅ Good performance for read-heavy workloads

**Considerations:**
- ⚠️ Weaker consistency guarantees (eventual consistency)
- ⚠️ More complex for relational data (friends, tags)
- ⚠️ Requires more operational expertise

**When to choose MongoDB:**
- If you prefer document-based data modeling
- If you need very flexible schemas
- If you have MongoDB expertise in your team

---

### Alternative: **Cassandra** (For extreme scale)

**Why Cassandra:**
- ✅ Designed for massive scale (millions of users)
- ✅ Linear scalability
- ✅ High availability (no single point of failure)
- ✅ Excellent write performance

**Considerations:**
- ⚠️ Complex setup and maintenance
- ⚠️ Eventual consistency (not ACID)
- ⚠️ Query limitations (must design for access patterns)
- ⚠️ Overkill for 100k users (better for 1M+)

**When to choose Cassandra:**
- If you expect to scale beyond 1M users
- If you need multi-region deployment
- If you have Cassandra expertise

---

## Recommended Stack for 100k Concurrent Users

### Option 1: PostgreSQL + Redis (Recommended)
```
┌─────────────┐
│   App       │
│  (Node.js)  │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
┌──────▼──────┐  ┌────▼─────┐
│ PostgreSQL  │  │  Redis   │
│  (Primary)  │  │ (Cache)   │
└──────┬──────┘  └──────────┘
       │
┌──────▼──────┐
│ PostgreSQL  │
│ (Replicas)  │
└─────────────┘
```

**Setup:**
- 1 Primary PostgreSQL instance (write)
- 2-3 Read replicas (read)
- Redis Cluster (3 nodes minimum)
- Connection pooling (PgBouncer)

**Estimated Costs (AWS):**
- PostgreSQL: db.r6g.2xlarge (8 vCPU, 64GB) = ~$500/month
- Read Replicas: 2x db.r6g.xlarge (4 vCPU, 32GB) = ~$500/month
- Redis: cache.r6g.xlarge (4 vCPU, 26GB) = ~$300/month
- **Total: ~$1,300/month**

---

### Option 2: MongoDB + Redis
```
┌─────────────┐
│   App       │
│  (Node.js)  │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
┌──────▼──────┐  ┌────▼─────┐
│  MongoDB    │  │  Redis   │
│  (Sharded)  │  │ (Cache)  │
└─────────────┘  └──────────┘
```

**Setup:**
- MongoDB Sharded Cluster (3 shards minimum)
- Redis Cluster
- Load balancer for shard routing

**Estimated Costs (AWS):**
- MongoDB: 3x M10 instances = ~$1,500/month
- Redis: cache.r6g.xlarge = ~$300/month
- **Total: ~$1,800/month**

---

## Database Schema Recommendations

### PostgreSQL Schema (Example)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE,
  display_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Games table (cached Steam data)
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  steam_app_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  studio VARCHAR(255),
  release_date TIMESTAMP,
  cover_image_url TEXT,
  header_image_url TEXT,
  description TEXT,
  metadata JSONB, -- Store additional Steam data
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_games_steam_app_id ON games(steam_app_id);
CREATE INDEX idx_games_name ON games USING gin(to_tsvector('english', name));

-- User game library
CREATE TABLE user_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, game_id)
);

CREATE INDEX idx_user_games_user_id ON user_games(user_id);
CREATE INDEX idx_user_games_game_id ON user_games(game_id);

-- Friends
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, blocked
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
```

---

## Performance Optimization Tips

1. **Connection Pooling**: Critical for high concurrency
   - Use PgBouncer with transaction pooling
   - Pool size: 20-50 per app instance

2. **Read Replicas**: Offload read queries
   - Use for game searches, friend libraries
   - Write to primary, read from replicas

3. **Indexing Strategy**:
   - Index frequently queried columns
   - Use composite indexes for multi-column queries
   - Monitor slow queries and optimize

4. **Caching Strategy**:
   - Cache Steam API responses (7 days)
   - Cache user game libraries (5 minutes)
   - Cache friend lists (1 minute)
   - Use Redis for all caching

5. **Query Optimization**:
   - Use prepared statements
   - Batch operations when possible
   - Limit result sets with pagination
   - Use EXPLAIN ANALYZE to optimize queries

6. **Monitoring**:
   - Track query performance
   - Monitor connection pool usage
   - Set up alerts for slow queries
   - Track cache hit rates

---

## Migration Path

1. **Phase 1 (0-10k users)**: Single PostgreSQL instance + Redis
2. **Phase 2 (10k-50k users)**: Add read replicas
3. **Phase 3 (50k-100k users)**: Optimize queries, add more replicas
4. **Phase 4 (100k+ users)**: Consider sharding or move to distributed DB

---

## Final Recommendation

**For 100,000 concurrent users, use:**
- **PostgreSQL** (primary database) with read replicas
- **Redis** (caching layer)
- **Connection pooling** (PgBouncer)
- **Proper indexing** and query optimization

This combination provides:
- ✅ Excellent performance
- ✅ Data integrity (ACID)
- ✅ Scalability
- ✅ Cost-effectiveness
- ✅ Proven at scale

