
import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import { printSchema } from 'graphql';
import * as fs from 'fs';
import * as path from 'path';

// Import all resolvers
import { UserResolver } from '../resolvers/UserResolver';
import { GraphResolver, NodeResolver, EdgeResolver } from '../resolvers/GraphResolver';
import { NodeTypeResolver } from '../resolvers/NodeTypeResolver';
import { EdgeTypeResolver } from '../resolvers/EdgeTypeResolver';
import { CommentResolver } from '../resolvers/CommentResolver';
import { SearchResolver } from '../resolvers/SearchResolver';
import { FormalInquiryResolver } from '../resolvers/FormalInquiryResolver';
import { ArticleResolver } from '../resolvers/ArticleResolver';
import { CollaborationResolver } from '../resolvers/CollaborationResolver';
import { GraphVersionResolver } from '../resolvers/GraphVersionResolver';
import { ContentAnalysisResolver } from '../resolvers/ContentAnalysisResolver';
import { GraphTraversalResolver } from '../resolvers/GraphTraversalResolver';
import { AdminConfigurationResolver } from '../resolvers/AdminConfigurationResolver';
import {
    ConversationalAIResolver,
    ConversationFieldResolver,
    ConversationMessageFieldResolver,
    ConversationalAIResponseFieldResolver
} from '../resolvers/ConversationalAIResolver';
import { PostActivityResolver } from '../resolvers/ActivityResolver';
import { NodeAssociationResolver } from '../resolvers/NodeAssociationResolver';
import { WhiteboardResolver } from '../resolvers/WhiteboardResolver';
import { StickyNoteResolver } from '../resolvers/StickyNoteResolver';
import { CollaborativePresenceResolver } from '../resolvers/CollaborativePresenceResolver';
import { MediaProcessingResolver } from '../resolvers/MediaProcessingResolver';

async function generateSchema() {
    try {
        const schema = await buildSchema({
            resolvers: [
                UserResolver,
                GraphResolver,
                CommentResolver,
                NodeResolver,
                EdgeResolver,
                NodeTypeResolver,
                EdgeTypeResolver,
                SearchResolver,
                FormalInquiryResolver,
                ArticleResolver,
                CollaborationResolver,
                GraphVersionResolver,
                ContentAnalysisResolver,
                GraphTraversalResolver,
                AdminConfigurationResolver,
                ConversationalAIResolver,
                ConversationFieldResolver,
                ConversationMessageFieldResolver,
                ConversationalAIResponseFieldResolver,
                PostActivityResolver,
                NodeAssociationResolver,
                WhiteboardResolver,
                StickyNoteResolver,
                CollaborativePresenceResolver,
                MediaProcessingResolver
            ],
            validate: false,
            authChecker: () => true, // Allow all for schema generation
        });

        const schemaSDL = printSchema(schema);
        const outputPath = path.resolve(__dirname, '../../../docs/schema.graphql');

        // Ensure dir exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, schemaSDL);
        console.log(`Schema generated at ${outputPath}`);
    } catch (error) {
        console.error('Error generating schema:', error);
        process.exit(1);
    }
}

generateSchema();
