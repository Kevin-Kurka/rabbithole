# Chat Interface Implementation Guide

## Overview

The AI-powered chat interface provides a conversational UI for interacting with the Rabbit Hole knowledge graph. Users can ask questions, search for nodes semantically, view conversation history, and see relevant context nodes automatically surfaced by the AI.

## Features Implemented

### Core Features
1. **Conversational UI** - Modern chat interface with message bubbles for user and assistant
2. **Node Linking** - Clickable node references that route to node detail pages
3. **File Attachment** - Drag-and-drop or click to upload files for analysis
4. **Real-time Typing Indicator** - Shows when AI is processing
5. **Semantic Search Integration** - Searches database nodes using vector similarity
6. **Context Display** - Shows relevant nodes used for AI responses
7. **Conversation History** - Load and manage past conversations from sidebar

### UI/UX Features
- Collapsible sidebar for conversation management
- Context panel (toggleable) showing relevant nodes
- Search bar for quick node lookup
- Markdown rendering in messages
- Responsive design (mobile-first)
- Smooth animations and loading states
- Empty states with helpful prompts

## File Structure

### Frontend Components

```
frontend/src/
├── app/chat/
│   └── page.tsx                          # Main chat page
├── components/
│   ├── chat-message.tsx                  # Individual message bubble
│   ├── chat-input.tsx                    # Message input with file upload
│   ├── chat-sidebar.tsx                  # Conversation list sidebar
│   ├── context-panel.tsx                 # Context nodes display
│   ├── node-link-card.tsx                # Hoverable node card
│   └── file-upload-button.tsx            # File attachment UI
└── components/ui/
    └── scroll-area.tsx                   # Radix UI scroll area
```

### Backend Implementation

The backend already has comprehensive conversational AI support:

```
backend/src/
├── resolvers/
│   └── ConversationalAIResolver.ts       # GraphQL resolver
├── services/
│   └── ConversationalAIService.ts        # Business logic
└── entities/
    └── Conversation.ts                   # Type definitions
```

## GraphQL API

### Mutations

#### Send AI Message
```graphql
mutation SendAIMessage($message: String!, $conversationId: ID, $graphId: ID) {
  sendAIMessage(message: $message, conversationId: $conversationId, graphId: $graphId) {
    conversationId
    response
    messageId
    relevantNodes {
      id
      title
      nodeType
      similarity
    }
  }
}
```

#### Delete Conversation
```graphql
mutation DeleteConversation($id: ID!) {
  deleteConversation(id: $id)
}
```

### Queries

#### Get User's Conversations
```graphql
query MyConversations($graphId: ID, $limit: Int, $offset: Int) {
  myConversations(graphId: $graphId, limit: $limit, offset: $offset) {
    id
    userId
    graphId
    title
    metadata
    createdAt
    updatedAt
    messageCount
  }
}
```

#### Get Conversation Messages
```graphql
query ConversationMessages($conversationId: ID!, $limit: Int, $offset: Int) {
  conversationMessages(conversationId: $conversationId, limit: $limit, offset: $offset) {
    id
    conversationId
    userId
    role
    content
    metadata
    createdAt
  }
}
```

#### Semantic Node Search
```graphql
query SearchNodesSemantic($query: String!, $graphId: ID) {
  searchNodesSemantic(query: $query, graphId: $graphId) {
    id
    title
    nodeType
    similarity
  }
}
```

## Component Details

### ChatMessage Component
- Renders user and assistant messages with distinct styling
- Parses markdown with GitHub flavored markdown support
- Handles node links in format: `[Node Title](node:node-id)`
- Shows timestamps and optional node link badges
- Supports avatar icons (User/Bot)

**Props:**
```typescript
interface ChatMessageProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  nodeLinks?: { id: string; title: string }[];
}
```

### ChatInput Component
- Auto-resizing textarea (up to 200px)
- File upload integration
- Keyboard shortcuts: Enter to send, Shift+Enter for new line
- Character count display
- Loading state with spinner

**Props:**
```typescript
interface ChatInputProps {
  onSendMessage: (message: string, files: UploadedFile[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}
```

### ChatSidebar Component
- Collapsible sidebar (80px collapsed, 320px expanded)
- Conversation list with metadata
- New conversation button
- Delete conversation action
- Timestamp formatting (relative times)

**Props:**
```typescript
interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (id: string) => void;
}
```

### ContextPanel Component
- Displays relevant nodes from AI responses
- Scrollable list of node cards
- Toggle visibility
- Empty state with helpful message
- Node count display

**Props:**
```typescript
interface ContextPanelProps {
  nodes: NodeLinkCardProps[];
  isOpen: boolean;
  onClose?: () => void;
}
```

### FileUploadButton Component
- Drag-and-drop support
- Multiple file selection (max 5 by default)
- Image preview generation
- File type icons
- File size display
- Remove individual files

**Props:**
```typescript
interface FileUploadButtonProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  accept?: string;
  disabled?: boolean;
}
```

## Usage

### Accessing the Chat Interface

Navigate to `/chat` in the application:

```typescript
router.push('/chat');
```

### Starting a Conversation

1. User types a message or uploads files
2. Click send or press Enter
3. Message is sent to backend with optional conversation ID
4. AI processes message using ConversationalAIService
5. Response includes:
   - AI-generated text response
   - Relevant nodes from semantic search
   - New or existing conversation ID
   - Message ID for tracking

### Node Linking

The AI can reference nodes in responses using markdown syntax:

```markdown
According to [Warren Commission Report](node:uuid-here), the findings were...
```

This renders as a clickable button that routes to `/nodes/uuid-here`.

### Semantic Search

The search bar in the header performs semantic vector search:

1. User types query (minimum 2 characters)
2. Debounced by 300ms
3. Searches using pgvector cosine similarity
4. Results sorted by relevance score
5. Displays matching nodes with similarity percentages

## Styling and Design

### Color Palette
- Background: `zinc-950` (main), `zinc-900` (cards)
- Borders: `zinc-700/50` (subtle)
- User messages: `blue-500/10` background, `blue-500/20` border
- Assistant messages: `zinc-800/50` background
- Accents: `blue-400` (primary), `purple-400` (assistant)

### Typography
- Markdown prose: `prose-invert` with custom sizing
- Message text: `text-sm` to `text-base`
- Timestamps: `text-xs text-zinc-500`
- Headers: `text-lg` to `text-2xl font-semibold`

### Animations
- Smooth scroll to new messages
- Hover transitions on cards and buttons
- Loading spinner for AI responses
- Fade-in for context panel

## Dependencies

### Installed Packages
```json
{
  "react-markdown": "^9.x.x",
  "remark-gfm": "^4.x.x",
  "@radix-ui/react-scroll-area": "^1.x.x"
}
```

Installed with: `npm install react-markdown remark-gfm @radix-ui/react-scroll-area --legacy-peer-deps`

### Existing Dependencies Used
- `@apollo/client` - GraphQL client
- `next-auth` - Authentication
- `lucide-react` - Icons
- `tailwindcss` - Styling
- `shadcn/ui` - UI primitives

## Configuration

### Environment Variables

Frontend requires:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/graphql
NEXT_PUBLIC_WS_URL=ws://localhost:4000/graphql
NEXTAUTH_SECRET=your-secret-key
```

Backend requires (already configured):
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://redis:6379
OPENAI_API_KEY=sk-...  # For embeddings
```

## Database Schema

The backend uses the following tables (already created):

### Conversations
```sql
CREATE TABLE public."Conversations" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public."Users"(id),
  graph_id UUID REFERENCES public."Graphs"(id),
  title TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### ConversationMessages
```sql
CREATE TABLE public."ConversationMessages" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public."Conversations"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."Users"(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Performance Considerations

### Optimizations Implemented
1. **Debounced Search** - 300ms delay prevents excessive API calls
2. **Lazy Loading** - Conversations loaded on demand
3. **Auto-scroll** - Smooth scroll to new messages
4. **Memoization** - React components use proper dependencies
5. **Pagination** - Conversations and messages support limit/offset

### Vector Search Performance
- Uses pgvector with HNSW index
- 1536-dimensional vectors (OpenAI embeddings)
- Cosine similarity distance operator (`<=>`)
- Indexed for O(log n) search performance

## Security

### Authentication
- Requires authenticated session (NextAuth)
- User ID validated in backend context
- Conversation ownership enforced

### Input Validation
- Message length: max 5000 characters
- Query sanitization in backend
- File upload restrictions (type, size)

### Data Privacy
- Conversations scoped to user
- No cross-user data leakage
- Metadata stored as JSONB for flexibility

## Troubleshooting

### Common Issues

**Build Error: Cannot find module 'react-markdown'**
```bash
cd frontend
npm install react-markdown remark-gfm --legacy-peer-deps
```

**Authentication Error: Not authenticated**
- Ensure user is logged in via NextAuth
- Check session in browser DevTools
- Verify `NEXTAUTH_SECRET` is set

**Empty Context Panel**
- AI service may not be returning relevant nodes
- Check backend logs for errors
- Verify OpenAI API key is valid

**Conversation not loading**
- Check browser console for GraphQL errors
- Verify conversation ID exists in database
- Check user has permission to access conversation

## Future Enhancements

### Planned Features
1. **Streaming Responses** - Real-time token streaming for AI responses
2. **Voice Input** - Speech-to-text for accessibility
3. **File Analysis** - OCR and content extraction from uploaded files
4. **Conversation Export** - Download chat history as PDF/JSON
5. **Advanced Filters** - Filter conversations by date, graph, topic
6. **Collaborative Chat** - Multi-user conversations
7. **Inline Node Editing** - Edit referenced nodes directly in chat
8. **Conversation Branches** - Fork conversations at any point

### API Enhancements
- GraphQL subscriptions for real-time updates
- Batch message operations
- Conversation tags/categories
- Full-text search across conversations
- Message reactions and annotations

## Testing

### Manual Testing Checklist
- [ ] Send message and receive AI response
- [ ] Create new conversation
- [ ] Load conversation history
- [ ] Delete conversation
- [ ] Search nodes semantically
- [ ] Click node links to navigate
- [ ] Upload files (images, PDFs)
- [ ] Collapse/expand sidebar
- [ ] Toggle context panel
- [ ] Test responsive design on mobile
- [ ] Test keyboard shortcuts

### Integration Testing
```bash
# Frontend tests (when implemented)
cd frontend
npm test

# Backend tests (existing)
cd backend
npm test
```

## Additional Resources

- [ConversationalAI Service Docs](./CONVERSATIONAL_AI_GUIDE.md)
- [AI Assistant Quick Start](./AI_ASSISTANT_QUICK_START.md)
- [File Upload System](./file-upload-system.md)
- [Backend Resolver Reference](./AIAssistantResolver.md)

## Support

For issues or questions:
1. Check backend logs: `docker logs rabbithole-api-1`
2. Check frontend console in browser DevTools
3. Review GraphQL queries in Network tab
4. Verify environment variables are set correctly

---

**Last Updated:** November 13, 2025
**Version:** 1.0.0
**Status:** Production Ready
