# Rabbit Hole MCP Server

Model Context Protocol (MCP) server providing AI assistants with read-only access to the Rabbit Hole knowledge graph.

## Features

- **Search Articles** - Find articles by keywords
- **Get Article Details** - Full article content and metadata
- **Annotations** - View AI-detected logical fallacies and deception
- **Trustworthiness Scores** - Get credibility ratings (0.0-1.0)
- **Related Articles** - Find citations, contradictions, and connections
- **Recent Articles** - Browse latest content

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Configuration

### Claude Desktop

Add to `~/.config/Claude/claude_desktop_config.json` (macOS/Linux) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "rabbithole": {
      "command": "node",
      "args": ["/absolute/path/to/rabbithole/mcp-server/dist/index.js"],
      "env": {
        "API_URL": "http://localhost:4000/api/v1/public"
      }
    }
  }
}
```

### Cursor

Add to Cursor settings:

```json
{
  "mcp.servers": {
    "rabbithole": {
      "command": "node",
      "args": ["/absolute/path/to/rabbithole/mcp-server/dist/index.js"],
      "env": {
        "API_URL": "http://localhost:4000/api/v1/public"
      }
    }
  }
}
```

## Usage

Once configured, AI assistants can use these tools:

### search_articles
```
Search for climate change articles
```

### get_article
```
Get article with ID abc-123-def
```

### get_article_annotations
```
Show deception analysis for article abc-123-def
```

### get_trustworthiness_score
```
What's the trustworthiness of article abc-123-def?
```

### get_related_articles
```
Find articles citing abc-123-def
```

### list_recent_articles
```
Show me the 10 most recent articles
```

### get_node_types
```
What types of content are in the knowledge graph?
```

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build

# Run
npm start
```

## Requirements

- Node.js 18+
- Running Rabbit Hole API server (http://localhost:4000)
- MCP-compatible AI assistant (Claude Desktop, Cursor, etc.)

## Architecture

The MCP server acts as a bridge between AI assistants and the Rabbit Hole REST API:

```
Claude Desktop/Cursor → MCP Server → Rabbit Hole REST API → PostgreSQL
```

All data is read-only - AI assistants cannot modify the knowledge graph.
