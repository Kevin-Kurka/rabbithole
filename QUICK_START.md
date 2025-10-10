# Project Rabbit Hole - Quick Start Guide

## 🚀 Application is Now Running!

**Frontend:** http://localhost:3001
**GraphQL API:** http://localhost:4000/graphql

---

## 🔐 Test Credentials

**Username:** test@example.com
**Password:** test

---

## 📝 How to Use

### 1. **Sign In**
- Open http://localhost:3001 in Chrome (already opened)
- You'll be redirected to sign in
- Use the test credentials above

### 2. **Navigate to Graph**
- After signing in, go to http://localhost:3001/graph
- You'll see an empty graph canvas

### 3. **Create Nodes**
- Click the **"+ Add Node"** button in the top-left panel
- Nodes appear with random positions
- Nodes are color-coded by veracity score:
  - 🔴 Red = Provisional (0-10%)
  - 🟠 Orange = Low confidence (10-39%)
  - 🟡 Yellow = Medium (40-69%)
  - 🟢 Lime = High (70-99%)
  - 🟢 Green = Level 0 Verified (100%)

### 4. **Connect Nodes**
- Hover over a node to see connection handles (circles)
- Click and drag from the **bottom circle** of one node
- Release on another node to create an edge

### 5. **Move Nodes**
- Click and drag any node to reposition it
- **Position automatically saves** when you release
- Refresh the page - positions persist!

### 6. **Delete Nodes**
- Click a node to select it
- Click **"Delete Node"** button in the panel
- Connected edges are automatically deleted

### 7. **Real-Time Collaboration**
- Open http://localhost:3001/graph in another browser/tab
- Sign in with the same credentials
- Changes sync in real-time across all clients!

---

## 🎨 Features Currently Working

✅ **Graph Visualization** - Interactive ReactFlow canvas
✅ **CRUD Operations** - Create, update, delete nodes and edges
✅ **Position Persistence** - x,y coordinates saved to database
✅ **Veracity Color Coding** - Visual feedback based on weight
✅ **Real-time Sync** - WebSocket subscriptions
✅ **Authentication** - NextAuth.js with credentials
✅ **Custom Node Components** - Color-coded with weight display
✅ **MiniMap & Controls** - Navigation tools
✅ **Background Grid** - Visual guides
✅ **Legend** - Veracity score reference

---

## 🛠️ GraphQL Playground

Test GraphQL queries directly at: http://localhost:4000/graphql

**Example Query:**
```graphql
query GetGraph {
  graph(id: "c14f48ce-b474-48ec-acc9-187c45555c4a") {
    id
    name
    nodes {
      id
      weight
      props
    }
    edges {
      id
      from {
        id
      }
      to {
        id
      }
    }
  }
}
```

**Example Mutation:**
```graphql
mutation CreateNode {
  createNode(input: {
    graphId: "c14f48ce-b474-48ec-acc9-187c45555c4a"
    props: "{\"label\": \"Test Node\", \"x\": 100, \"y\": 100}"
  }) {
    id
    weight
    props
  }
}
```

---

## 🔧 Troubleshooting

### Frontend Not Loading?
```bash
docker logs rabbithole-frontend-1
```

### Backend Errors?
```bash
docker logs rabbithole-api-1
```

### Database Issues?
```bash
docker logs rabbithole-postgres-1
```

### Restart Everything
```bash
docker-compose down
docker-compose up --build -d
```

### Check Service Status
```bash
docker-compose ps
```

---

## 📊 Database Direct Access

```bash
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db
```

**Useful Commands:**
```sql
-- See all graphs
SELECT * FROM public."Graphs";

-- See all nodes
SELECT id, props, weight FROM public."Nodes";

-- See all edges
SELECT id, source_node_id, target_node_id FROM public."Edges";

-- Create a new graph
INSERT INTO public."Graphs" (name) VALUES ('Test Graph') RETURNING id;
```

---

## 🎯 Next Steps

Once you've tested the basic functionality:

1. **Try Real-Time Collaboration**
   - Open two browser windows side-by-side
   - Make changes in one, watch them appear in the other

2. **Test Position Persistence**
   - Move some nodes around
   - Refresh the page
   - Verify positions are saved

3. **Explore the Code**
   - Custom node: `frontend/src/components/CustomNode.tsx`
   - Graph page: `frontend/src/app/graph/page.tsx`
   - Backend resolvers: `backend/src/resolvers/GraphResolver.ts`

4. **Check Implementation Status**
   - See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)
   - Review [CLAUDE.md](./CLAUDE.md) for architecture details

---

## 🚨 Known Limitations

- Graph ID is hardcoded (no graph switcher yet)
- Can't edit node labels in UI (only via props)
- No undo/redo functionality
- Node types are not selectable
- Edge styling doesn't reflect weight yet
- No file upload for evidence nodes
- No methodology templates yet

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for the full roadmap.

---

## 📞 Support

Created: October 8, 2025
Status: **MVP Phase 1 Complete**

Enjoy exploring Project Rabbit Hole! 🐰🕳️
