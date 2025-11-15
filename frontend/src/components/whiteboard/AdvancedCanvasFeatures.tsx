import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import {
  Type,
  Undo,
  Redo,
  ZoomIn,
  Grid3x3,
  History,
  Save,
  FolderOpen,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { gql, useMutation } from '@apollo/client';

// ============================================================================
// PHASE 5: Text Box Creator
// ============================================================================

const CREATE_TEXT_BOX = gql`
  mutation CreateTextBox($input: CreateTextBoxNodeInput!) {
    createTextBoxNode(input: $input) {
      id
      title
      type
      props
    }
  }
`;

interface TextBoxCreatorProps {
  graphId: string;
  onNodeCreate: (node: any) => void;
}

export const TextBoxCreator: React.FC<TextBoxCreatorProps> = ({ graphId, onNodeCreate }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [createTextBox] = useMutation(CREATE_TEXT_BOX);

  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (!isCreating) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setPosition({ x, y });

    const type = prompt('Enter text box type (Thesis, Citation, or Reference):');
    const title = prompt('Enter title:');
    const content = prompt('Enter content:');

    if (type && title && content) {
      createTextBox({
        variables: {
          input: {
            graphId,
            type,
            title,
            content,
            position: { x, y },
          },
        },
      }).then(({ data }) => {
        onNodeCreate(data.createTextBoxNode);
        setIsCreating(false);
      });
    } else {
      setIsCreating(false);
    }
  }, [isCreating, graphId, createTextBox, onNodeCreate]);

  return (
    <div className="absolute top-4 left-4 z-10">
      <button
        onClick={() => setIsCreating(!isCreating)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
          isCreating
            ? 'bg-blue-500 text-white'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <Type className="w-4 h-4" />
        {isCreating ? 'Click to place text box' : 'Add Text Box'}
      </button>
    </div>
  );
};

// ============================================================================
// PHASE 6: Undo/Redo System
// ============================================================================

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

export const useUndoRedo = (initialNodes: Node[], initialEdges: Edge[]) => {
  const [history, setHistory] = useState<HistoryState[]>([{ nodes: initialNodes, edges: initialEdges }]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const pushState = useCallback((nodes: Node[], edges: Edge[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push({ nodes, edges });
      return newHistory;
    });
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  }, [currentIndex, history]);

  return { pushState, undo, redo, canUndo: currentIndex > 0, canRedo: currentIndex < history.length - 1 };
};

interface UndoRedoControlsProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault();
        onUndo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && canRedo) {
        e.preventDefault();
        onRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, canUndo, canRedo]);

  return (
    <div className="absolute top-4 left-48 z-10 flex gap-2">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`p-2 rounded-lg transition-colors ${
          canUndo
            ? 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
            : 'bg-gray-100 dark:bg-gray-900 opacity-50 cursor-not-allowed'
        }`}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="w-4 h-4" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`p-2 rounded-lg transition-colors ${
          canRedo
            ? 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
            : 'bg-gray-100 dark:bg-gray-900 opacity-50 cursor-not-allowed'
        }`}
        title="Redo (Ctrl+Y)"
      >
        <Redo className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================================================
// PHASE 6: Smart Selection & Zoom
// ============================================================================

interface ZoomToSelectionProps {
  selectedNodes: Node[];
  onZoom: (nodes: Node[]) => void;
}

export const ZoomToSelection: React.FC<ZoomToSelectionProps> = ({ selectedNodes, onZoom }) => {
  const handleZoomToSelection = () => {
    if (selectedNodes.length > 0) {
      onZoom(selectedNodes);
    }
  };

  return (
    <button
      onClick={handleZoomToSelection}
      disabled={selectedNodes.length === 0}
      className={`absolute top-4 left-96 z-10 p-2 rounded-lg transition-colors ${
        selectedNodes.length > 0
          ? 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
          : 'bg-gray-100 dark:bg-gray-900 opacity-50 cursor-not-allowed'
      }`}
      title="Zoom to Selection"
    >
      <ZoomIn className="w-4 h-4" />
    </button>
  );
};

// ============================================================================
// PHASE 7: Auto-Layout System
// ============================================================================

type LayoutType = 'grid' | 'tree' | 'radial' | 'force';

interface AutoLayoutButtonProps {
  nodes: Node[];
  onLayout: (nodes: Node[]) => void;
}

export const AutoLayoutButton: React.FC<AutoLayoutButtonProps> = ({ nodes, onLayout }) => {
  const [layoutType, setLayoutType] = useState<LayoutType>('grid');
  const [isOpen, setIsOpen] = useState(false);

  const applyLayout = (type: LayoutType) => {
    const layoutedNodes = [...nodes];

    switch (type) {
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(layoutedNodes.length));
        layoutedNodes.forEach((node, i) => {
          node.position = {
            x: (i % cols) * 200,
            y: Math.floor(i / cols) * 150,
          };
        });
        break;
      }
      case 'tree': {
        // Simple tree layout (would need proper tree traversal in production)
        const levels = new Map<string, number>();
        const levelCounts = new Map<number, number>();

        layoutedNodes.forEach((node, i) => {
          const level = Math.floor(i / 3);
          levels.set(node.id, level);
          levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
        });

        layoutedNodes.forEach((node) => {
          const level = levels.get(node.id) || 0;
          const index = levelCounts.get(level) || 1;
          node.position = {
            x: index * 200,
            y: level * 200,
          };
        });
        break;
      }
      case 'radial': {
        const center = { x: 400, y: 300 };
        const radius = 250;
        layoutedNodes.forEach((node, i) => {
          const angle = (i / layoutedNodes.length) * 2 * Math.PI;
          node.position = {
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle),
          };
        });
        break;
      }
      case 'force': {
        // Simplified force-directed layout
        layoutedNodes.forEach((node, i) => {
          node.position = {
            x: Math.random() * 800,
            y: Math.random() * 600,
          };
        });

        // Simulate repulsion (simplified)
        for (let iter = 0; iter < 10; iter++) {
          layoutedNodes.forEach((node1, i) => {
            layoutedNodes.forEach((node2, j) => {
              if (i !== j) {
                const dx = node2.position.x - node1.position.x;
                const dy = node2.position.y - node1.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = 100 / (dist * dist);
                node1.position.x -= (dx / dist) * force;
                node1.position.y -= (dy / dist) * force;
              }
            });
          });
        }
        break;
      }
    }

    onLayout(layoutedNodes);
    setLayoutType(type);
    setIsOpen(false);
  };

  return (
    <div className="absolute top-16 left-4 z-10">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Grid3x3 className="w-4 h-4" />
          Auto Layout
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="absolute top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <button
              onClick={() => applyLayout('grid')}
              className="block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Grid Layout
            </button>
            <button
              onClick={() => applyLayout('tree')}
              className="block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Tree Layout
            </button>
            <button
              onClick={() => applyLayout('radial')}
              className="block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Radial Layout
            </button>
            <button
              onClick={() => applyLayout('force')}
              className="block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Force-Directed
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// PHASE 8: Version History Viewer
// ============================================================================

interface Version {
  version: number;
  timestamp: string;
  changes: any;
  userId: string;
}

interface VersionHistoryViewerProps {
  nodeId: string;
  versions: Version[];
  onRestore: (version: Version) => void;
}

export const VersionHistoryViewer: React.FC<VersionHistoryViewerProps> = ({
  nodeId,
  versions,
  onRestore,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-16 right-4 z-10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <History className="w-4 h-4" />
        Version History
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-80 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="p-4">
            <h3 className="font-semibold mb-3">Version History</h3>
            {versions.length === 0 ? (
              <p className="text-sm text-gray-500">No version history available</p>
            ) : (
              <div className="space-y-2">
                {versions.map((version) => (
                  <div
                    key={version.version}
                    className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">Version {version.version}</div>
                        <div className="text-xs text-gray-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(version.timestamp).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          By user: {version.userId}
                        </div>
                      </div>
                      <button
                        onClick={() => onRestore(version)}
                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Restore
                      </button>
                    </div>
                    {version.changes && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        <strong>Changes:</strong>
                        <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">
                          {JSON.stringify(version.changes, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PHASE 8: Templates Selector
// ============================================================================

interface Template {
  id: string;
  name: string;
  description: string;
  nodes: Partial<Node>[];
  edges: Partial<Edge>[];
}

const TEMPLATES: Template[] = [
  {
    id: 'scientific-method',
    name: 'Scientific Method',
    description: 'Hypothesis → Experiment → Analysis → Conclusion',
    nodes: [
      { id: '1', type: 'Hypothesis', position: { x: 100, y: 100 }, data: { label: 'Hypothesis' } },
      { id: '2', type: 'Experiment', position: { x: 300, y: 100 }, data: { label: 'Experiment' } },
      { id: '3', type: 'Analysis', position: { x: 500, y: 100 }, data: { label: 'Analysis' } },
      { id: '4', type: 'Conclusion', position: { x: 700, y: 100 }, data: { label: 'Conclusion' } },
    ],
    edges: [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      { id: 'e3', source: '3', target: '4' },
    ],
  },
  {
    id: 'toulmin-argument',
    name: 'Toulmin Argument',
    description: 'Claim → Data → Warrant → Backing → Qualifier → Rebuttal',
    nodes: [
      { id: '1', type: 'Claim', position: { x: 400, y: 50 }, data: { label: 'Claim' } },
      { id: '2', type: 'Data', position: { x: 200, y: 200 }, data: { label: 'Data' } },
      { id: '3', type: 'Warrant', position: { x: 400, y: 200 }, data: { label: 'Warrant' } },
      { id: '4', type: 'Backing', position: { x: 600, y: 200 }, data: { label: 'Backing' } },
      { id: '5', type: 'Qualifier', position: { x: 200, y: 350 }, data: { label: 'Qualifier' } },
      { id: '6', type: 'Rebuttal', position: { x: 600, y: 350 }, data: { label: 'Rebuttal' } },
    ],
    edges: [
      { id: 'e1', source: '2', target: '1' },
      { id: 'e2', source: '3', target: '1' },
      { id: 'e3', source: '4', target: '3' },
      { id: 'e4', source: '5', target: '1' },
      { id: 'e5', source: '6', target: '1' },
    ],
  },
];

interface TemplateSelectorProps {
  onApplyTemplate: (template: Template) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onApplyTemplate }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute bottom-4 left-4 z-10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <FolderOpen className="w-4 h-4" />
        Templates
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="p-4">
            <h3 className="font-semibold mb-3">Graph Templates</h3>
            <div className="space-y-2">
              {TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => {
                    onApplyTemplate(template);
                    setIsOpen(false);
                  }}
                >
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};