# 📘 AI Knowledge Graph Database: Developer & Agent Guide

## 1. System Overview

This project uses a **Hybrid Metaschema** that combines the strictness of relational databases, the connectivity of graphs, and the semantic power of vector search.

**The Core 4-Table Structure:**

1. **`node_types`**: Classes/Definitions (e.g., `Person`, `Invoice`).
2. **`edge_types`**: Relationships/Verbs (e.g., `worksFor`, `generatedBy`).
3. **`nodes`**: The data instances.
4. **`edges`**: The connections between instances.

---

## 2. Schema.org Alignment Strategy

**Objective:** To ensure interoperability and AI comprehensibility, all Type definitions must generally follow [Schema.org](https://schema.org) conventions.

### A. Creating `node_types`

When defining a new Node Type, map it to the closest Schema.org Class.

- **`name`**: Use the PascalCase Schema.org class name (e.g., `Person`, `CreativeWork`, `Organization`).
- **`props`**: Define a JSON Schema that restricts valid properties for this type.
- **`parent_node_type_id`**: If inheritance exists (e.g., `Physician` extends `Person`), link it.

**SQL Example: Defining a "Person"**

```sql
INSERT INTO node_types (name, props) VALUES (
    'Person', 
    '{
        "description": "A living, dead, or undead person.",
        "schema_org_url": "https://schema.org/Person",
        "type": "object",
        "properties": {
            "givenName": { "type": "string" },
            "familyName": { "type": "string" },
            "email": { "type": "string", "format": "email" },
            "jobTitle": { "type": "string" }
        },
        "required": ["givenName", "email"]
    }'::jsonb
);
```

### B. Creating `edge_types`

Edges represent **Schema.org properties** that link two Entities.

- **`name`**: Use the camelCase Schema.org property name (e.g., `worksFor`, `author`, `memberOf`).
- **Constraints**: Strictly define `source_node_type_id` and `target_node_type_id` to enforce graph integrity.

**SQL Example: Defining "worksFor"**

```sql
-- Assuming we have UUIDs for 'Person' and 'Organization' types
INSERT INTO edge_types (name, source_node_type_id, target_node_type_id, props) VALUES (
    'worksFor',
    (SELECT id FROM node_types WHERE name = 'Person'),
    (SELECT id FROM node_types WHERE name = 'Organization'),
    '{
        "description": "Relationships between a person and an organization.",
        "cardinality": "many_to_many"
    }'::jsonb
);
```

---

## 3. Data Management: `props` vs `meta`

Strict separation of concerns is enforced.

### ✅ `props` (The "What")

- **Definition:** The immutable (or business-logic mutable) facts about the entity.
- **Validation:** MUST conform to the JSON Schema defined in the `node_type`.
- **Search:** This data is indexed for Full-Text Search (`text_search`) and Vector Search (`ai`).
- **Example:** `{"givenName": "Alice", "email": "alice@example.com"}`

### 🛡️ `meta` (The "How")

- **Definition:** System-level data, audit logs, and processing flags.
- **Validation:** Flexible; not validated against the user schema.
- **Usage:** Used for permissions, syncing status, and audit trails.
- **Example:**
  ```json
  {
    "embedding_status": "dirty",
    "source_system": "CRM_Import_v1",
    "audit_log": [
       {"action": "create", "user": "admin", "ts": "2023-10-10T..."}
    ]
  }
  ```

---

## 4. The Embedding Lifecycle (Dirty Flags)

We use an asynchronous "Dirty Flag" pattern to manage vector embeddings. **Do not generate embeddings synchronously during HTTP requests.**

### Phase 1: The Mutation (App/Agent)

When you Insert or Update a node/edge, the database trigger automatically:

1. Updates `updated_at`.
2. Sets `meta->'embedding_status' = 'dirty'`.

### Phase 2: The Worker (Background Process)

An AI Agent or Worker script monitors the DB.

**1. Poll for dirty records:**

```sql
SELECT id, props, node_type_id 
FROM nodes 
WHERE meta->>'embedding_status' = 'dirty' 
  AND archived_at IS NULL 
LIMIT 50;
```

**2. Generate Embedding:**
Send the `props` (serialized to text) to your Embedding Model (e.g., OpenAI text-embedding-3-small).

**3. Write Back & Clean:**

```sql
UPDATE nodes 
SET 
    ai = '[...vector data...]',
    meta = jsonb_set(meta, '{embedding_status}', '"clean"')
WHERE id = '...uuid...';
```

---

## 5. Querying Protocols

### A. Hybrid Search (Best Practice)

To find specific nodes, combine **Keyword Match** (Index-accelerated) with **Semantic Match**.

```sql
SELECT 
    id, 
    props->>'givenName' as name, 
    1 - (ai <=> '[...query_vector...]') as similarity_score
FROM nodes
WHERE 
    -- 1. Hard Filter (Fast GIN Index)
    props->>'jobTitle' = 'Engineer'
    -- 2. Keyword Filter (Fast TSVector Index)
    AND text_search @@ to_tsquery('english', 'Python')
    -- 3. Semantic Filter (HNSW Index)
    AND archived_at IS NULL
ORDER BY ai <=> '[...query_vector...]' ASC
LIMIT 10;
```

### B. Graph Traversal

To find context (e.g., "Who does Alice work for?"):

```sql
SELECT 
    org.props->>'name' as company_name,
    edges.props as role_details
FROM nodes as person
JOIN edges ON edges.source_node_id = person.id
JOIN nodes as org ON edges.target_node_id = org.id
JOIN edge_types et ON edges.edge_type_id = et.id
WHERE 
    person.props->>'email' = 'alice@example.com'
    AND et.name = 'worksFor';
```

---

## 6. Instructions for AI Agents (System Prompt)

If you are an AI Agent operating on this database, adhere to these rules:

1. **Schema First:** Before inserting data, always query `node_types` to understand the required schema validation.
2. **Check Metadata:** Before answering a user query about data validity, check `nodes.meta` to see if `embedding_status` is "dirty". If so, warn the user the data might not be indexed for semantic search yet.
3. **Soft Deletes:** Always filter `WHERE archived_at IS NULL` unless explicitly asked for historical/deleted data.
4. **Inference:** If a user asks to create a new type, browse `schema.org` definitions first and suggest a structure that mirrors standard ontology.

---

## 7. Key Features

### Hybrid Search
- **Full-Text Search**: Automatically generated `text_search` column using `jsonb_to_tsvector`
- **Vector Search**: HNSW indexes on `ai` column for semantic similarity
- **Property Search**: GIN indexes on `props` for fast JSONB queries

### Dirty Flag Pattern
- Automatic flagging when `props` changes
- Background workers process dirty records asynchronously
- Prevents blocking HTTP requests with embedding generation

### Graph Integrity
- Edge type validation enforced by triggers
- Source/target node type constraints
- Self-loop prevention

### Soft Deletes
- `archived_at` column for soft deletion
- Partial indexes exclude archived records from vector search
- Saves RAM and improves query performance

### Audit Trail
- `meta` column stores audit logs, permissions, sync status
- Separate from business data in `props`
- Flexible JSONB structure for system metadata
