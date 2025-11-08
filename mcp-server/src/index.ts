#!/usr/bin/env node

/**
 * Rabbit Hole MCP Server
 *
 * Provides AI assistants (Claude Desktop, Cursor, etc.) with access to:
 * - Public knowledge graph nodes (articles, documents, evidence)
 * - Article annotations and deception analysis
 * - Node relationships (edges)
 * - Trustworthiness scores
 * - Full-text search
 *
 * MCP (Model Context Protocol) is Anthropic's standard for connecting AI assistants
 * to external data sources and tools.
 *
 * Installation:
 * 1. npm install
 * 2. npm run build
 * 3. Add to Claude Desktop config (~/.config/Claude/claude_desktop_config.json):
 *    {
 *      "mcpServers": {
 *        "rabbithole": {
 *          "command": "node",
 *          "args": ["/path/to/rabbithole/mcp-server/dist/index.js"],
 *          "env": {
 *            "API_URL": "http://localhost:4000/api/v1/public"
 *          }
 *        }
 *      }
 *    }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:4000/api/v1/public';

// MCP Tools available to AI assistants
const TOOLS: Tool[] = [
  {
    name: 'search_articles',
    description: 'Search for articles in the knowledge graph by keyword. Returns article titles, content snippets, and trustworthiness scores.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (keywords to search for in articles)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 10, max 100)',
          default: 10,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_article',
    description: 'Get full details of a specific article by ID, including content, metadata, and trustworthiness score.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: {
          type: 'string',
          description: 'The unique ID of the article node',
        },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'get_article_annotations',
    description: 'Get all annotations (highlights, deception tags, notes) for an article. Shows logical fallacies, exaggerations, and misleading content detected by AI.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: {
          type: 'string',
          description: 'The unique ID of the article node',
        },
        status: {
          type: 'string',
          description: 'Filter by annotation status (approved, pending_review, disputed)',
          enum: ['approved', 'pending_review', 'disputed', 'rejected'],
        },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'get_trustworthiness_score',
    description: 'Get the trustworthiness score for an article (0.0-1.0). Combines credibility from challenges and deception detection. Higher scores indicate more trustworthy content.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: {
          type: 'string',
          description: 'The unique ID of the article node',
        },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'get_related_articles',
    description: 'Get articles related to a specific article through edges (citations, supports, contradicts, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: {
          type: 'string',
          description: 'The unique ID of the article node',
        },
        direction: {
          type: 'string',
          description: 'Direction of relationships (incoming, outgoing, both)',
          enum: ['incoming', 'outgoing', 'both'],
          default: 'both',
        },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'list_recent_articles',
    description: 'List recently created or updated public articles with pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of articles to return (default 20, max 100)',
          default: 20,
        },
        offset: {
          type: 'number',
          description: 'Pagination offset',
          default: 0,
        },
        sort: {
          type: 'string',
          description: 'Sort field',
          enum: ['created_at', 'updated_at', 'weight'],
          default: 'created_at',
        },
        order: {
          type: 'string',
          description: 'Sort order',
          enum: ['asc', 'desc'],
          default: 'desc',
        },
      },
    },
  },
  {
    name: 'get_node_types',
    description: 'Get all available node types in the knowledge graph (Article, Document, Evidence, Event, Person, Source, etc.).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Helper function to make API calls
async function callAPI(endpoint: string, params?: Record<string, any>): Promise<any> {
  try {
    const url = `${API_URL}${endpoint}`;
    const response = await axios.get(url, { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Failed to call API: ${error.message}`);
  }
}

// Format article data for AI assistant
function formatArticle(node: any): string {
  const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;
  const title = props.title || 'Untitled';
  const content = props.content || 'No content';
  const weight = node.weight || 0.5;

  return `**${title}**
ID: ${node.id}
Type: ${node.node_type || 'Unknown'}
Credibility: ${(weight * 100).toFixed(0)}%
Created: ${node.created_at}

${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`;
}

// Format annotation data for AI assistant
function formatAnnotation(annotation: any): string {
  const severity = annotation.severity || 'unknown';
  const fallacyType = annotation.deception_type || annotation.annotation_type;
  const confidence = annotation.confidence ? `${(annotation.confidence * 100).toFixed(0)}%` : 'N/A';

  return `**${fallacyType}** (${severity} severity, ${confidence} confidence)
Text: "${annotation.highlighted_text}"
Explanation: ${annotation.explanation || 'No explanation'}
Status: ${annotation.status}
Votes: ${annotation.votes || 0}`;
}

// Create and start the MCP server
const server = new Server(
  {
    name: 'rabbithole',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool list requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_articles': {
        const { query, limit = 10 } = args as { query: string; limit?: number };
        const data = await callAPI('/search', { q: query, limit });

        const results = data.data.map((node: any) => formatArticle(node)).join('\n\n---\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${data.data.length} articles matching "${query}":\n\n${results}`,
            },
          ],
        };
      }

      case 'get_article': {
        const { nodeId } = args as { nodeId: string };
        const data = await callAPI(`/nodes/${nodeId}`);

        return {
          content: [
            {
              type: 'text',
              text: formatArticle(data.data),
            },
          ],
        };
      }

      case 'get_article_annotations': {
        const { nodeId, status } = args as { nodeId: string; status?: string };
        const data = await callAPI(`/nodes/${nodeId}/annotations`, status ? { status } : {});

        if (data.data.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No annotations found for this article.',
              },
            ],
          };
        }

        const annotations = data.data.map((ann: any) => formatAnnotation(ann)).join('\n\n---\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${data.data.length} annotations:\n\n${annotations}`,
            },
          ],
        };
      }

      case 'get_trustworthiness_score': {
        const { nodeId } = args as { nodeId: string };
        const data = await callAPI(`/nodes/${nodeId}/trustworthiness`);

        const score = data.data;
        const overall = (score.overallScore * 100).toFixed(0);
        const credibility = (score.credibilityScore * 100).toFixed(0);
        const annotation = (score.annotationScore * 100).toFixed(0);

        return {
          content: [
            {
              type: 'text',
              text: `**Trustworthiness Score: ${overall}%**

Breakdown:
- Credibility (from challenges): ${credibility}%
- Annotation Score (from AI deception detection): ${annotation}%

Deception Analysis:
- Total deceptions detected: ${score.deceptionCount}
- High severity: ${score.breakdown.highSeverity}
- Medium severity: ${score.breakdown.mediumSeverity}
- Low severity: ${score.breakdown.lowSeverity}`,
            },
          ],
        };
      }

      case 'get_related_articles': {
        const { nodeId, direction = 'both' } = args as { nodeId: string; direction?: string };
        const data = await callAPI(`/nodes/${nodeId}/edges`, { direction });

        if (data.data.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No related articles found.',
              },
            ],
          };
        }

        const edges = data.data
          .map((edge: any) => {
            const sourceProps = typeof edge.source_props === 'string' ? JSON.parse(edge.source_props) : edge.source_props;
            const targetProps = typeof edge.target_props === 'string' ? JSON.parse(edge.target_props) : edge.target_props;

            return `**${edge.edge_type}**: ${sourceProps.title || 'Untitled'} ’ ${targetProps.title || 'Untitled'}
Source ID: ${edge.source_node_id}
Target ID: ${edge.target_node_id}`;
          })
          .join('\n\n---\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${data.data.length} related articles:\n\n${edges}`,
            },
          ],
        };
      }

      case 'list_recent_articles': {
        const { limit = 20, offset = 0, sort = 'created_at', order = 'desc' } = args as {
          limit?: number;
          offset?: number;
          sort?: string;
          order?: string;
        };
        const data = await callAPI('/nodes', { limit, offset, sort, order });

        const articles = data.data.map((node: any) => formatArticle(node)).join('\n\n---\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Recent articles (${data.pagination.offset + 1}-${
                data.pagination.offset + data.data.length
              } of ${data.pagination.total}):\n\n${articles}`,
            },
          ],
        };
      }

      case 'get_node_types': {
        const data = await callAPI('/node-types');

        const types = data.data
          .map((type: any) => {
            return `**${type.name}**: ${type.description || 'No description'}`;
          })
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Available node types:\n\n${types}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Rabbit Hole MCP Server running on stdio');
  console.error(`API URL: ${API_URL}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
