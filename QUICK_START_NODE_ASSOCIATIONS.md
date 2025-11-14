# Quick Start: Node Associations Feature

## For Developers - Getting Started

### What Was Built
The Node Details page now has four collapsible sections instead of just "Evidence Files":
1. **Files** - Upload and view attachments
2. **Nodes** - Link related nodes
3. **References** - Add external references
4. **Citations** - Add citations from sources

Each section has hover-activated actions and an AI processor for external URLs.

### Quick Demo

#### 1. Start the Application
```bash
docker-compose up
```

#### 2. Navigate to a Node
Go to: `http://localhost:3000/nodes/{any-node-id}`

#### 3. Try the Features

**Add a Reference:**
1. Hover over "References" section header
2. Click the quote icon
3. Enter URL: `https://en.wikipedia.org/wiki/JFK_Assassination`
4. Submit

**Process with AI:**
1. Hover over the reference you just added
2. Click the sparkle ✨ icon
3. Add context (optional)
4. Click "Process with AI"
5. Watch the progress bar complete 6 steps

**Link Nodes:**
1. Hover over "Nodes" section header
2. Click the link icon
3. Search for a node
4. Select to associate

**Upload Files:**
1. Hover over "Files" section header
2. Click paperclip icon
3. Upload a file

### Component Architecture

```
NodeDetailsPage
└── NodeAssociationsPanel (new)
    ├── Files Section
    │   └── UploadFileDialog
    ├── Nodes Section
    │   └── NodeLinkCombobox
    ├── References Section
    │   └── AddReferenceDialog
    └── Citations Section
        ├── AddReferenceDialog
        └── AIReferenceProcessorDialog
```

### Key Files to Know

**Frontend:**
- `frontend/src/components/node-associations-panel.tsx` - Main panel
- `frontend/src/components/ai-reference-processor-dialog.tsx` - AI processor
- `frontend/src/app/nodes/[id]/page.tsx` - Integration point

**Backend:**
- `backend/src/resolvers/NodeAssociationResolver.ts` - GraphQL resolver
- `backend/migrations/023_node_references.sql` - Database schema

**GraphQL:**
- `frontend/src/graphql/queries/evidence-files.ts` - Updated queries

### GraphQL Usage Examples

#### Query References
```typescript
import { useQuery } from '@apollo/client';
import { GET_NODE_REFERENCES } from '@/graphql/queries/evidence-files';

const { data } = useQuery(GET_NODE_REFERENCES, {
  variables: {
    nodeId: 'your-node-id',
    type: 'reference' // or 'citation'
  }
});
```

#### Add Reference
```typescript
import { useMutation } from '@apollo/client';
import { ADD_REFERENCE } from '@/graphql/queries/evidence-files';

const [addReference] = useMutation(ADD_REFERENCE);

await addReference({
  variables: {
    input: {
      nodeId: 'your-node-id',
      url: 'https://example.com',
      title: 'Example Reference',
      type: 'reference'
    }
  }
});
```

#### Process Reference with AI
```typescript
import { useMutation } from '@apollo/client';
import { PROCESS_REFERENCE } from '@/graphql/queries/evidence-files';

const [processReference] = useMutation(PROCESS_REFERENCE);

const result = await processReference({
  variables: {
    input: {
      url: 'https://example.com',
      parentNodeId: 'your-node-id',
      additionalContext: 'Focus on credibility analysis'
    }
  }
});

console.log(result.data.processReference.confidence); // 0.85
console.log(result.data.processReference.nodeId); // New node ID
```

### Customization Points

#### Change Confidence Colors
In `node-associations-panel.tsx`:
```typescript
const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'text-green-500';  // Change these
  if (confidence >= 0.6) return 'text-yellow-500'; // thresholds
  return 'text-red-500';                           // and colors
};
```

#### Modify Processing Steps
In `ai-reference-processor-dialog.tsx`:
```typescript
const [steps, setSteps] = useState<ProcessingStep[]>([
  { id: '1', label: 'Fetching URL content', status: 'pending' },
  // Add/remove/modify steps here
]);
```

#### Add New Section
1. Add section state in `node-associations-panel.tsx`
2. Create collapsible card component
3. Add hover state for action icon
4. Create dialog component for actions
5. Update GraphQL queries/mutations

### Common Tasks

#### Replace Mock Data with Real Data

**In NodeAssociationsPanel:**
```typescript
// Replace this:
const [files, setFiles] = useState<AssociatedFile[]>([...mockData]);

// With this:
const { data } = useQuery(GET_EVIDENCE_FILES, {
  variables: { evidenceId }
});
const files = data?.getEvidenceFiles || [];
```

#### Add New Reference Type

1. **Update Database:**
```sql
ALTER TABLE public."NodeReferences"
DROP CONSTRAINT check_reference_type;

ALTER TABLE public."NodeReferences"
ADD CONSTRAINT check_reference_type
CHECK (type IN ('reference', 'citation', 'your-new-type'));
```

2. **Update TypeScript Types:**
```typescript
type: 'reference' | 'citation' | 'your-new-type';
```

3. **Add UI Section** in NodeAssociationsPanel

#### Connect Real AI Service

In `NodeAssociationResolver.ts`, replace:
```typescript
// TODO: Implement actual web scraping service
const scrapedContent = `Scraped content from ${input.url}`;

// TODO: Implement actual AI analysis service
const confidence = 0.85;
```

With calls to your AI services:
```typescript
const scrapedContent = await webScrapingService.scrape(input.url);
const analysis = await aiService.analyzeCredibility(scrapedContent);
const confidence = analysis.confidenceScore;
```

### Troubleshooting

#### "NodeAssociationsPanel not found"
```bash
cd frontend
npm install
npm run dev
```

#### "NodeReferences table doesn't exist"
```bash
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/023_node_references.sql
```

#### GraphQL errors
```bash
docker restart rabbithole-api-1
docker logs rabbithole-api-1 --tail 50
```

#### Styling issues
- Check Tailwind CSS classes
- Verify shadcn/ui components installed
- Check theme provider configuration

### Testing

#### Unit Tests (TODO)
```bash
cd frontend
npm test -- node-associations-panel.test.tsx
```

#### Integration Tests (TODO)
```bash
cd backend
npm test -- NodeAssociationResolver.test.ts
```

#### Manual Testing Checklist
- [ ] All four sections collapse/expand
- [ ] Hover shows action icons
- [ ] File upload opens dialog
- [ ] Node search returns results
- [ ] Add reference saves to database
- [ ] AI processor shows progress
- [ ] Confidence scores display correctly
- [ ] Click node navigates to detail page
- [ ] Click URL opens in new tab

### Next Steps

1. **Connect Real Data Sources**
   - Replace mock data with GraphQL queries
   - Test with actual database

2. **Implement AI Services**
   - Web scraping service
   - Credibility analysis
   - Fact-checking integration

3. **Add Tests**
   - Component tests
   - Integration tests
   - E2E tests

4. **Enhance UI**
   - Loading states
   - Error boundaries
   - Animations

5. **Performance**
   - Pagination for large lists
   - Virtual scrolling
   - Optimistic updates

### Resources

- [Full Implementation Docs](./NODE_ASSOCIATIONS_IMPLEMENTATION.md)
- [GraphQL Schema](./backend/src/resolvers/NodeAssociationResolver.ts)
- [Database Schema](./backend/migrations/023_node_references.sql)
- [Component Docs](./frontend/src/components/)

### Support

For questions or issues:
1. Check implementation docs
2. Review component code
3. Check GraphQL schema
4. Check database logs
5. Ask the team!

---

**Happy Coding! 🚀**
