-- ============================================================================
-- Migration 024: Whiteboard Interactive Features
-- ============================================================================
-- Description: Adds node types and features for interactive whiteboard canvas
-- Author: Database Architecture Team
-- Date: 2025-11-14
-- ============================================================================

-- ============================================================================
-- ADD NEW NODE TYPES FOR WHITEBOARD
-- ============================================================================

-- Insert new node types for canvas text elements
-- These node types don't have credibility scores (weight is null/not applicable)

INSERT INTO public."NodeTypes" (name, description, props, meta)
VALUES
    (
        'Thesis',
        'A thesis statement that provides an overarching argument or position',
        jsonb_build_object(
            'schema', jsonb_build_object(
                'content', jsonb_build_object(
                    'type', 'string',
                    'required', true,
                    'description', 'The thesis statement text'
                ),
                'citations', jsonb_build_object(
                    'type', 'array',
                    'items', jsonb_build_object('type', 'string', 'format', 'uuid'),
                    'description', 'Array of node IDs that this thesis cites'
                )
            )
        ),
        jsonb_build_object(
            'category', 'annotation',
            'isTextBox', true,
            'hasCredibilityScore', false,
            'canvasElement', true
        )
    ),
    (
        'Citation',
        'A reference to a source or node with attribution information',
        jsonb_build_object(
            'schema', jsonb_build_object(
                'source', jsonb_build_object(
                    'type', 'string',
                    'required', true,
                    'description', 'The citation source or reference'
                ),
                'sourceType', jsonb_build_object(
                    'type', 'string',
                    'enum', '["academic", "web", "book", "article", "node"]',
                    'description', 'Type of citation source'
                ),
                'referencedNodeId', jsonb_build_object(
                    'type', 'string',
                    'format', 'uuid',
                    'description', 'Node ID if citing an internal node'
                ),
                'url', jsonb_build_object(
                    'type', 'string',
                    'format', 'uri',
                    'description', 'URL to external source'
                ),
                'authors', jsonb_build_object(
                    'type', 'array',
                    'items', jsonb_build_object('type', 'string'),
                    'description', 'Authors of the cited work'
                ),
                'publicationDate', jsonb_build_object(
                    'type', 'string',
                    'format', 'date',
                    'description', 'Date of publication'
                )
            )
        ),
        jsonb_build_object(
            'category', 'annotation',
            'isTextBox', true,
            'hasCredibilityScore', false,
            'canvasElement', true
        )
    ),
    (
        'Reference',
        'A general reference or note pointing to another node or external resource',
        jsonb_build_object(
            'schema', jsonb_build_object(
                'text', jsonb_build_object(
                    'type', 'string',
                    'required', true,
                    'description', 'The reference text or note'
                ),
                'targetNodeId', jsonb_build_object(
                    'type', 'string',
                    'format', 'uuid',
                    'description', 'Node ID if referencing an internal node'
                ),
                'externalUrl', jsonb_build_object(
                    'type', 'string',
                    'format', 'uri',
                    'description', 'URL if referencing external resource'
                )
            )
        ),
        jsonb_build_object(
            'category', 'annotation',
            'isTextBox', true,
            'hasCredibilityScore', false,
            'canvasElement', true
        )
    )
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ENHANCE NODES TABLE FOR CANVAS POSITIONING
-- ============================================================================

-- Add canvas-specific fields to Nodes if they don't exist
-- These will be stored in the props JSONB, but we document the schema here
COMMENT ON COLUMN public."Nodes".props IS E'JSONB properties including:
  - Canvas positioning: {position: {x: number, y: number}}
  - Canvas dimensions: {dimensions: {width: number, height: number}}
  - Canvas layer: {zIndex: number} (calculated from credibility score)
  - Grouping: {groupId: uuid, isCollapsed: boolean}
  - Visual style: {color: string, backgroundColor: string}';

-- Document the version history structure in meta field
COMMENT ON COLUMN public."Nodes".meta IS E'JSONB metadata including:
  - Version history: {
      versionHistory: [
        {
          timestamp: ISO8601,
          userId: uuid,
          operation: "create"|"update"|"move"|"delete",
          changes: {field: {old: any, new: any}},
          position: {x: number, y: number}
        }
      ]
    }
  - Canvas metadata: {
      isTextBox: boolean,
      lastEditedBy: uuid,
      lastEditedAt: ISO8601
    }';

-- ============================================================================
-- ENHANCE ACTIVITY POSTS FOR STICKY NOTES
-- ============================================================================

-- Add styling and positioning fields for sticky note visualization
-- These will be stored in a new column for canvas-specific data
ALTER TABLE public."ActivityPosts"
  ADD COLUMN IF NOT EXISTS canvas_props JSONB DEFAULT '{}'::jsonb;

-- Document canvas_props schema
COMMENT ON COLUMN public."ActivityPosts".canvas_props IS E'JSONB canvas properties for sticky note rendering:
  {
    style: {
      color: "yellow"|"blue"|"green"|"pink"|"orange",
      size: "small"|"medium"|"large"
    },
    autoPosition: {
      anchorNodeId: uuid,
      offset: {x: number, y: number},
      preferredSide: "top"|"right"|"bottom"|"left"
    },
    zIndexOffset: 0.001
  }';

-- Index for canvas properties on activity posts
CREATE INDEX IF NOT EXISTS idx_activity_posts_canvas_props
  ON public."ActivityPosts" USING GIN(canvas_props);

-- ============================================================================
-- ADD INDEXES FOR WHITEBOARD PERFORMANCE
-- ============================================================================

-- Index for finding nodes by type (useful for filtering text boxes)
CREATE INDEX IF NOT EXISTS idx_nodes_node_type_canvas
  ON public."Nodes" (node_type_id, graph_id)
  WHERE meta->>'isTextBox' = 'true';

-- GIN index for props (canvas positioning queries)
CREATE INDEX IF NOT EXISTS idx_nodes_props_gin
  ON public."Nodes" USING GIN(props);

-- GIN index for meta (version history queries)
CREATE INDEX IF NOT EXISTS idx_nodes_meta_gin
  ON public."Nodes" USING GIN(meta);

-- ============================================================================
-- FUNCTIONS FOR VERSION HISTORY
-- ============================================================================

-- Function to append version history to node.meta
CREATE OR REPLACE FUNCTION append_node_version_history(
    node_uuid UUID,
    user_uuid UUID,
    operation_type TEXT,
    changes_data JSONB,
    position_data JSONB DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    current_meta JSONB;
    current_history JSONB;
    new_version JSONB;
BEGIN
    -- Get current meta
    SELECT meta INTO current_meta
    FROM public."Nodes"
    WHERE id = node_uuid;

    -- Get existing version history or initialize empty array
    current_history := COALESCE(current_meta->'versionHistory', '[]'::jsonb);

    -- Build new version entry
    new_version := jsonb_build_object(
        'timestamp', NOW(),
        'userId', user_uuid,
        'operation', operation_type,
        'changes', changes_data,
        'position', position_data
    );

    -- Append new version to history
    current_meta := jsonb_set(
        COALESCE(current_meta, '{}'::jsonb),
        '{versionHistory}',
        current_history || new_version
    );

    -- Update node
    UPDATE public."Nodes"
    SET meta = current_meta, updated_at = NOW()
    WHERE id = node_uuid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION append_node_version_history IS 'Appends a version history entry to a node''s meta field';

-- Function to get sticky note z-index based on parent node credibility
CREATE OR REPLACE FUNCTION calculate_sticky_note_zindex(parent_node_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
    parent_weight REAL;
BEGIN
    SELECT weight INTO parent_weight
    FROM public."Nodes"
    WHERE id = parent_node_uuid;

    -- Return parent weight + 0.001 for sticky note layering
    RETURN COALESCE(parent_weight, 0.5) + 0.001;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_sticky_note_zindex IS 'Calculates z-index for sticky notes as parent credibility + 0.001';

-- ============================================================================
-- VIEWS FOR WHITEBOARD QUERIES
-- ============================================================================

-- View for all text box nodes (Thesis, Citation, Reference)
CREATE OR REPLACE VIEW public."TextBoxNodes" AS
SELECT n.*, nt.name as node_type_name
FROM public."Nodes" n
JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
WHERE nt.name IN ('Thesis', 'Citation', 'Reference');

COMMENT ON VIEW public."TextBoxNodes" IS 'All text box nodes for whiteboard annotations';

-- View for canvas nodes with position data
CREATE OR REPLACE VIEW public."CanvasNodes" AS
SELECT
    id,
    graph_id,
    node_type_id,
    title,
    props,
    meta,
    weight,
    is_level_0,
    props->>'position' as position_json,
    props->>'dimensions' as dimensions_json,
    COALESCE((props->>'zIndex')::numeric, weight) as z_index,
    created_at,
    updated_at
FROM public."Nodes"
WHERE props ? 'position';

COMMENT ON VIEW public."CanvasNodes" IS 'Nodes with canvas positioning data for whiteboard rendering';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to auto-update version history on node changes
CREATE OR REPLACE FUNCTION trigger_node_version_history()
RETURNS TRIGGER AS $$
DECLARE
    changes JSONB;
BEGIN
    -- Build changes object comparing OLD and NEW
    changes := jsonb_build_object();

    IF OLD.title IS DISTINCT FROM NEW.title THEN
        changes := changes || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title));
    END IF;

    IF OLD.props IS DISTINCT FROM NEW.props THEN
        changes := changes || jsonb_build_object('props', jsonb_build_object('old', OLD.props, 'new', NEW.props));
    END IF;

    IF OLD.weight IS DISTINCT FROM NEW.weight THEN
        changes := changes || jsonb_build_object('weight', jsonb_build_object('old', OLD.weight, 'new', NEW.weight));
    END IF;

    -- Only record if there are actual changes
    IF changes != '{}'::jsonb THEN
        -- Append version history (user_id will be from created_by, operation is 'update')
        PERFORM append_node_version_history(
            NEW.id,
            COALESCE(NEW.created_by, OLD.created_by),
            'update',
            changes,
            NEW.props->'position'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Disable trigger temporarily to add it
DROP TRIGGER IF EXISTS trigger_node_version_history ON public."Nodes";

-- Create trigger for version history tracking
CREATE TRIGGER trigger_node_version_history
    BEFORE UPDATE ON public."Nodes"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_node_version_history();

COMMENT ON TRIGGER trigger_node_version_history ON public."Nodes" IS 'Automatically tracks version history in node meta field';

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Document permissions structure
COMMENT ON COLUMN public."Nodes".permissions IS E'JSONB array of permission objects:
  [
    {
      userId: uuid,
      role: "owner"|"editor"|"viewer"|"commenter",
      grantedBy: uuid,
      grantedAt: ISO8601,
      expiresAt: ISO8601|null
    }
  ]

  Roles:
  - owner: Full control (edit, delete, manage permissions)
  - editor: Edit content and properties
  - viewer: Read-only access
  - commenter: View and add comments/sticky notes';

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- This section is commented out - uncomment for dev/test environments only

/*
-- Example: Create a test thesis node
DO $$
DECLARE
    test_graph_id UUID;
    test_user_id UUID;
    thesis_type_id UUID;
BEGIN
    -- Get a test graph and user
    SELECT id INTO test_graph_id FROM public."Graphs" WHERE level = 1 LIMIT 1;
    SELECT id INTO test_user_id FROM public."Users" LIMIT 1;
    SELECT id INTO thesis_type_id FROM public."NodeTypes" WHERE name = 'Thesis';

    IF test_graph_id IS NOT NULL AND test_user_id IS NOT NULL AND thesis_type_id IS NOT NULL THEN
        INSERT INTO public."Nodes" (
            graph_id,
            node_type_id,
            title,
            props,
            meta,
            weight,
            is_level_0,
            created_by
        ) VALUES (
            test_graph_id,
            thesis_type_id,
            'Example Thesis',
            jsonb_build_object(
                'content', 'This is an example thesis statement for testing',
                'position', jsonb_build_object('x', 100, 'y', 100),
                'dimensions', jsonb_build_object('width', 300, 'height', 150)
            ),
            jsonb_build_object(
                'isTextBox', true,
                'versionHistory', '[]'::jsonb
            ),
            NULL, -- No credibility score for text boxes
            false,
            test_user_id
        );
    END IF;
END $$;
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON SCHEMA public IS 'Migration 024: Whiteboard interactive features - Added Thesis, Citation, Reference node types and canvas positioning support';
