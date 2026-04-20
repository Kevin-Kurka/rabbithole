# Rabbithole

A research platform where users publish articles, challenge claims with evidence, build theories connecting disparate information, and use AI to discover hidden connections.

Built on [Sentient BaaS](https://github.com/Kevin-Kurka/sentient).

## Quick Start

### Prerequisites

- Sentient BaaS running locally (port 8005)
- Node.js 20+
- An admin token from Sentient

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd rabbithole
npm install

# 2. Configure
cp .env .env.local  # Edit VITE_SENTIENT_API_URL if needed

# 3. Register data model in Sentient
export SENTIENT_TOKEN="your-admin-jwt-token"
./seed/register-types.sh

# 4. Seed sample data (optional)
./seed/sample-data.sh

# 5. Run the app
npm run dev
```

Open http://localhost:3000

## Architecture

```
Rabbithole Frontend (React/Vite)
        │
        ▼
Sentient BaaS API (localhost:8005)
        │
        ▼
PostgreSQL + pgvector
```

No custom backend — Rabbithole talks directly to Sentient's REST API for all operations.

## Data Model

- **Articles** — user-written research pieces
- **Claims** — statements highlighted from articles
- **Challenges** — formal disputes with evidence and voting
- **Evidence** — sourced material supporting/refuting claims
- **Theories** — narratives connecting multiple pieces
- **Sources** — external citations
- **Votes** — community scoring on challenges

Everything is a node in the graph. Relationships are edges. The AI can traverse and discover connections.
