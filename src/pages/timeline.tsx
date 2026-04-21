import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listNodes } from '../lib/api';
import type { SentientNode } from '../lib/types';

interface TimelineEvent {
  id: string;
  type: string;
  date: Date;
  title: string;
  excerpt: string;
  node: SentientNode<any>;
}

export function TimelinePage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>({});
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  useEffect(() => {
    loadTimeline();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [typeFilters, events]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const nodes = await listNodes(undefined, 200);

      // Extract dates and create timeline events
      const timelineEvents: TimelineEvent[] = [];
      const types = new Set<string>();

      for (const node of nodes) {
        const props = node.properties as any;
        const dateStr =
          props.published_at ||
          props.opened_at ||
          props.created_at ||
          props.cast_at;

        if (dateStr) {
          const date = new Date(dateStr);
          types.add(node.type);

          timelineEvents.push({
            id: node.id,
            type: node.type,
            date,
            title: props.title || props.text || `${node.type} Event`,
            excerpt:
              props.body?.substring(0, 100) ||
              props.text?.substring(0, 100) ||
              props.rationale?.substring(0, 100) ||
              '',
            node,
          });
        }
      }

      // Sort by date descending (newest first)
      timelineEvents.sort((a, b) => b.date.getTime() - a.date.getTime());

      setEvents(timelineEvents);
      setAvailableTypes(Array.from(types).sort());

      // Initialize all type filters to true
      const initialFilters: Record<string, boolean> = {};
      Array.from(types).forEach(type => {
        initialFilters[type] = true;
      });
      setTypeFilters(initialFilters);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    const filtered = events.filter(event =>
      typeFilters[event.type] !== false
    );
    setFilteredEvents(filtered);
  };

  const toggleTypeFilter = (type: string) => {
    setTypeFilters(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      ARTICLE: 'text-crt-info',
      CLAIM: 'text-crt-warning',
      CHALLENGE: 'text-crt-warning',
      EVIDENCE: 'text-crt-fg',
      SOURCE: 'text-crt-fg',
      THEORY: 'text-crt-fg',
      VOTE: 'text-crt-muted',
    };
    return colors[type] || 'text-crt-fg';
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCardClick = (node: SentientNode) => {
    const routeMap: Record<string, string> = {
      ARTICLE: '/article',
      CLAIM: '/claim',
      CHALLENGE: '/challenge',
      EVIDENCE: '/evidence',
      SOURCE: '/source',
      THEORY: '/theory',
    };

    const route = routeMap[node.type];
    if (route) {
      navigate(`${route}/${node.id}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto font-mono">
        <div className="text-center py-12">
          <p className="text-crt-dim">[ Loading timeline... ]</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto font-mono">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4 text-crt-fg">TIMELINE</h1>
        <p className="text-crt-muted mb-6">
          Chronological view of all investigation events ({filteredEvents.length} items)
        </p>

        {/* Filter Controls */}
        <div className="bg-black border border-crt-border p-4 mb-6">
          <h2 className="text-sm font-bold text-crt-fg mb-3">FILTER BY TYPE:</h2>
          <div className="flex flex-wrap gap-3">
            {availableTypes.map(type => (
              <label
                key={type}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={typeFilters[type] !== false}
                  onChange={() => toggleTypeFilter(type)}
                  className="w-4 h-4 accent-crt-fg"
                />
                <span className={`text-sm font-medium ${getTypeColor(type)}`}>
                  {type}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {filteredEvents.length > 0 ? (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-crt-fg opacity-30"></div>

          {/* Events */}
          <div className="space-y-8">
            {filteredEvents.map((event, idx) => (
              <div key={event.id} className="relative pl-20">
                {/* Timeline dot */}
                <div className="absolute left-0 top-2 w-4 h-4 bg-crt-fg rounded-full"></div>

                {/* Event card */}
                <button
                  onClick={() => handleCardClick(event.node)}
                  className="w-full text-left p-4 bg-black border border-crt-border hover:border-crt-fg hover:shadow-lg transition-all"
                >
                  {/* Date and type */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-crt-dim">
                      {formatDate(event.date)}
                    </span>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-bold border ${getTypeColor(event.type)} border-current`}
                    >
                      {event.type}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-crt-fg font-bold mb-1 line-clamp-2">
                    {event.title}
                  </h3>

                  {/* Excerpt */}
                  {event.excerpt && (
                    <p className="text-sm text-crt-muted line-clamp-2">
                      {event.excerpt}
                    </p>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 border border-crt-border p-8">
          <p className="text-crt-muted mb-2">[ NO EVENTS ]</p>
          <p className="text-crt-dim text-sm">
            No timeline events match the selected filters
          </p>
        </div>
      )}
    </div>
  );
}
