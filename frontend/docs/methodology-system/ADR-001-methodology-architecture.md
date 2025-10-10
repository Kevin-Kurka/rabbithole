# ADR-001: Methodology System Architecture

## Status
Proposed

## Context
Project Rabbit Hole requires a flexible methodology system that enables users to apply structured investigation frameworks to their Level 1 graphs. Users need to be able to select from pre-built methodologies (5 Whys, SCAMPER, Fishbone, etc.) or create their own custom methodologies. Each methodology provides custom node types, relationship types, and guided workflows.

Key challenges include:
- Supporting both system-provided and user-created methodologies
- Maintaining data integrity while allowing flexibility
- Ensuring performance with complex methodology definitions
- Enabling methodology versioning and evolution
- Supporting collaborative methodology development

## Decision

### 1. Data-Driven Architecture
We will implement methodologies as data (JSON schemas) rather than code. This approach provides:
- Runtime flexibility without code deployment
- User-created methodologies without security risks
- Easy import/export of methodology definitions
- Version control at the data level

### 2. Three-Layer Methodology Model
```
Methodology Definition Layer
    ↓
Validation & Constraint Layer
    ↓
Runtime Execution Layer
```

- **Definition Layer**: Stores methodology metadata, node/edge types, and workflows in PostgreSQL
- **Validation Layer**: Enforces constraints and validates graph operations against methodology rules
- **Constraint Layer**: Runtime engine that executes workflows and enforces methodology compliance

### 3. PostgreSQL with JSONB for Flexible Schemas
We will use PostgreSQL's JSONB columns for storing:
- Node and edge property schemas (JSON Schema format)
- Workflow step definitions
- Visual configuration
- Validation rules

This provides schema flexibility while maintaining relational integrity for core relationships.

### 4. Methodology Inheritance and Versioning
- Methodologies can have parent relationships for versioning
- Forking creates a new methodology with parent reference
- Graphs maintain reference to specific methodology version
- Migration paths allow upgrading graphs to new methodology versions

### 5. Separate Tables for Components
Rather than storing everything in a single methodology table, we separate:
- `Methodologies` - Core methodology metadata
- `MethodologyNodeTypes` - Custom node type definitions
- `MethodologyEdgeTypes` - Custom edge type definitions
- `MethodologyWorkflows` - Workflow step definitions
- `UserMethodologyProgress` - Track user progress through workflows

This normalized structure enables:
- Efficient querying of specific components
- Granular permissions and sharing
- Component reuse across methodologies
- Better caching strategies

## Consequences

### Positive
- **Extensibility**: Easy to add new methodologies without code changes
- **User Empowerment**: Users can create and share custom methodologies
- **Performance**: Efficient querying with proper indexing
- **Maintainability**: Clear separation of concerns
- **Scalability**: Can handle thousands of custom methodologies
- **Versioning**: Built-in support for methodology evolution
- **Security**: No code execution for custom methodologies

### Negative
- **Complexity**: More tables and relationships to manage
- **Validation Overhead**: Runtime validation of JSON schemas
- **Migration Complexity**: Need to handle schema migrations for methodology updates
- **Learning Curve**: Users need to understand methodology constraints

### Risks
- **Schema Drift**: JSON schemas might evolve incompatibly
  - *Mitigation*: Versioning and migration tools
- **Performance Impact**: Complex constraint validation might slow operations
  - *Mitigation*: Caching, indexed lookups, async validation
- **Abuse Potential**: Users creating confusing or malicious methodologies
  - *Mitigation*: Reputation gates, community review, reporting system

## Alternatives Considered

### Alternative 1: Code-Based Methodologies
Each methodology implemented as a TypeScript/JavaScript module.
- **Rejected because**: Security risks, deployment complexity, limits user customization

### Alternative 2: Single Methodology Table
Store all methodology data in a single table with large JSONB column.
- **Rejected because**: Poor query performance, difficult to index, hard to maintain referential integrity

### Alternative 3: Graph Database for Methodologies
Use a separate graph database (Neo4j) for methodology definitions.
- **Rejected because**: Operational complexity, additional infrastructure, synchronization challenges

### Alternative 4: NoSQL Document Store
Store methodologies in MongoDB or similar document database.
- **Rejected because**: Loses transactional guarantees with main PostgreSQL database, additional infrastructure

## Implementation Notes

### Phase 1: Core Infrastructure
1. Database schema creation (tables, indexes, functions)
2. GraphQL schema and resolvers
3. Basic CRUD operations for methodologies

### Phase 2: Pre-built Methodologies
1. Implement 8 standard methodologies
2. Seed database with methodology definitions
3. Create methodology selection UI

### Phase 3: Workflow Engine
1. Workflow execution engine
2. Progress tracking
3. Validation framework

### Phase 4: Custom Methodologies
1. Methodology builder UI
2. Template marketplace
3. Sharing and permissions

### Performance Optimizations
- Index JSONB fields for common queries
- Cache methodology definitions in Redis
- Lazy load workflow steps
- Compile validation rules for repeated use

### Security Considerations
- Validate all JSON schemas before storage
- Sanitize user-provided content
- Rate limit methodology operations
- Reputation requirements for publishing

## References
- [JSON Schema Specification](https://json-schema.org/)
- [PostgreSQL JSONB Performance](https://www.postgresql.org/docs/current/datatype-json.html)
- [GraphQL Schema Design Best Practices](https://www.apollographql.com/docs/technotes/schema-design-best-practices/)
- [Workflow Pattern Catalog](http://www.workflowpatterns.com/)