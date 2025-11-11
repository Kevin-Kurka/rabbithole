"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User, Send, FileText, Link2, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import LoginDialog from '@/components/LoginDialog';
import { useResponsive } from '@/hooks/useResponsive';
import { MobileHomePage } from '@/components/mobile/MobileHomePage';

/**
 * Home Page - Adaptive layout with mobile/desktop variants
 * Mobile: Vertical feed with trending nodes, categories, activity
 * Desktop: Starfield canvas with nodes and AI chat
 */
interface Node {
  id: string;
  title: string;
  type: string;
  credibility: number;
  x: number;
  y: number;
  connections: string[];
}

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { isMobile } = useResponsive();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  // Dragging state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Mock nodes data - replace with actual GraphQL query
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: '1',
      title: 'JFK Assassination',
      type: 'Investigation',
      credibility: 85,
      x: 30,
      y: 40,
      connections: ['2', '3']
    },
    {
      id: '2',
      title: 'Warren Commission Report',
      type: 'Evidence',
      credibility: 72,
      x: 60,
      y: 30,
      connections: ['1']
    },
    {
      id: '3',
      title: 'Lee Harvey Oswald',
      type: 'Person',
      credibility: 90,
      x: 50,
      y: 60,
      connections: ['1', '4']
    },
    {
      id: '4',
      title: 'Jack Ruby',
      type: 'Person',
      credibility: 88,
      x: 70,
      y: 70,
      connections: ['3']
    },
  ]);

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aiQuery.trim()) {
      // TODO: Send to AI backend
      console.log('AI Query:', aiQuery);
      setAiQuery('');
    }
  };

  const handleAvatarClick = () => {
    if (!session) {
      setShowLoginModal(true);
    } else {
      router.push('/profile');
    }
  };

  const handleNodeClick = (nodeId: string) => {
    router.push(`/nodes/${nodeId}`);
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent, nodeId: string, node: Node) => {
    e.stopPropagation();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const nodeX = (node.x / 100) * rect.width;
    const nodeY = (node.y / 100) * rect.height;

    setDraggedNodeId(nodeId);
    setDragOffset({
      x: e.clientX - nodeX,
      y: e.clientY - nodeY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNodeId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = ((e.clientX - dragOffset.x) / rect.width) * 100;
    const newY = ((e.clientY - dragOffset.y) / rect.height) * 100;

    // Clamp values between 0 and 100
    const clampedX = Math.max(0, Math.min(100, newX));
    const clampedY = Math.max(0, Math.min(100, newY));

    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === draggedNodeId
          ? { ...node, x: clampedX, y: clampedY }
          : node
      )
    );
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
  };

  // Get icon based on node type
  const getNodeTypeIcon = (type: string) => {
    switch (type) {
      case 'Investigation':
        return <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1} />;
      case 'Evidence':
        return <FileText className="w-3.5 h-3.5" strokeWidth={1} />;
      case 'Person':
        return <User className="w-3.5 h-3.5" strokeWidth={1} />;
      default:
        return <FileText className="w-3.5 h-3.5" strokeWidth={1} />;
    }
  };

  // Render mobile version on mobile devices
  if (isMobile) {
    return <MobileHomePage user={session?.user} />;
  }

  // Render desktop version (starfield canvas)
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Starfield Background - 3 Layers with Parallax */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 starfield-layer-1" />
        <div className="absolute inset-0 starfield-layer-2" />
        <div className="absolute inset-0 starfield-layer-3" />
      </div>

      {/* Canvas with Nodes */}
      <div
        ref={canvasRef}
        className="absolute inset-0 z-10"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {nodes.flatMap(node =>
            node.connections.map(targetId => {
              const target = nodes.find(n => n.id === targetId);
              if (!target) return null;
              return (
                <line
                  key={`${node.id}-${targetId}`}
                  x1={`${node.x}%`}
                  y1={`${node.y}%`}
                  x2={`${target.x}%`}
                  y2={`${target.y}%`}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="1"
                />
              );
            })
          )}
        </svg>

        {/* Node Cards */}
        {nodes.map(node => (
          <div
            key={node.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              cursor: draggedNodeId === node.id ? 'grabbing' : 'grab',
            }}
            onMouseDown={(e) => handleMouseDown(e, node.id, node)}
          >
            <div
              onClick={(e) => {
                // Only trigger click if not dragging
                if (draggedNodeId === null) {
                  handleNodeClick(node.id);
                }
              }}
              className="group relative"
            >
              {/* Node Card */}
              <div className="w-56 bg-zinc-900/90 backdrop-blur-xl border border-white/20 rounded shadow-2xl hover:border-white/40 hover:bg-zinc-800/90 transition-all overflow-hidden" style={{ borderWidth: '1px', borderRadius: '8px' }}>
                {/* Top Row - Node Title */}
                <div className="px-4 py-3 border-b border-white/10" style={{ borderBottomWidth: '1px' }}>
                  <h3 className="text-white font-medium text-sm leading-tight text-left truncate">
                    {node.title}
                  </h3>
                </div>

                {/* Bottom Row - Type, Credibility, Link Icon */}
                <div className="px-4 py-2 flex items-center justify-between">
                  {/* Left: Type Icon and Credibility */}
                  <div className="flex items-center gap-2">
                    {/* Type Icon */}
                    <div className="text-zinc-400">
                      {getNodeTypeIcon(node.type)}
                    </div>

                    {/* Credibility Score */}
                    <div className="text-zinc-400">
                      <span className="text-xs font-medium">{node.credibility}%</span>
                    </div>
                  </div>

                  {/* Right: Link Icon */}
                  <div className="text-zinc-400 group-hover:text-white transition-colors">
                    <Link2 className="w-3.5 h-3.5" strokeWidth={1} />
                  </div>
                </div>
              </div>

              {/* Connection Dot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      {/* Floating Avatar - Top Right */}
      <button
        onClick={handleAvatarClick}
        className="fixed top-8 right-8 w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all shadow-2xl z-50"
        style={{ borderWidth: '1px' }}
      >
        {session?.user?.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || 'User'}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <User className="w-6 h-6 text-white" />
        )}
      </button>

      {/* AI Chat Input - Bottom */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-8 z-50">
        <form onSubmit={handleAiSubmit} className="relative">
          <div className="flex items-center gap-4 bg-zinc-900/80 backdrop-blur-xl border border-white/10 px-6 py-4 shadow-2xl" style={{ borderWidth: '1px', borderRadius: '8px' }}>
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Ask AI anything about the graph..."
              className="flex-1 bg-transparent border-none outline-none text-white text-base placeholder:text-zinc-500"
            />
            <button
              type="submit"
              className="p-2 bg-white/10 hover:bg-white/20 transition-all border border-white/20"
              style={{ borderWidth: '1px', borderRadius: '8px' }}
              disabled={!aiQuery.trim()}
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </form>
      </div>

      {/* Login Modal */}
      <LoginDialog
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      <style jsx>{`
        /* Layer 1 - Fastest, Largest Stars */
        .starfield-layer-1 {
          background: radial-gradient(2px 2px at 20% 30%, white, transparent),
                      radial-gradient(2px 2px at 60% 70%, white, transparent),
                      radial-gradient(2px 2px at 50% 50%, white, transparent),
                      radial-gradient(2px 2px at 80% 10%, white, transparent),
                      radial-gradient(2px 2px at 90% 60%, white, transparent);
          background-size: 250% 250%;
          animation: starfield-fast 100s linear infinite;
          opacity: 0.6;
        }

        /* Layer 2 - Medium Speed, Medium Stars */
        .starfield-layer-2 {
          background: radial-gradient(1.5px 1.5px at 33% 80%, rgba(255,255,255,0.8), transparent),
                      radial-gradient(1.5px 1.5px at 15% 90%, rgba(255,255,255,0.8), transparent),
                      radial-gradient(1.5px 1.5px at 75% 25%, rgba(255,255,255,0.8), transparent),
                      radial-gradient(1.5px 1.5px at 45% 45%, rgba(255,255,255,0.8), transparent);
          background-size: 300% 300%;
          animation: starfield-medium 150s linear infinite;
          opacity: 0.5;
        }

        /* Layer 3 - Slowest, Smallest Stars */
        .starfield-layer-3 {
          background: radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.6), transparent),
                      radial-gradient(1px 1px at 40% 60%, rgba(255,255,255,0.6), transparent),
                      radial-gradient(1px 1px at 70% 80%, rgba(255,255,255,0.6), transparent),
                      radial-gradient(1px 1px at 85% 15%, rgba(255,255,255,0.6), transparent),
                      radial-gradient(1px 1px at 25% 40%, rgba(255,255,255,0.6), transparent),
                      radial-gradient(1px 1px at 55% 75%, rgba(255,255,255,0.6), transparent);
          background-size: 400% 400%;
          animation: starfield-slow 250s linear infinite;
          opacity: 0.4;
        }

        @keyframes starfield-fast {
          0% { background-position: 0% 0%; }
          100% { background-position: 250% 250%; }
        }

        @keyframes starfield-medium {
          0% { background-position: 0% 0%; }
          100% { background-position: 300% 300%; }
        }

        @keyframes starfield-slow {
          0% { background-position: 0% 0%; }
          100% { background-position: 400% 400%; }
        }
      `}</style>
    </div>
  );
}
