interface TagBadgesProps {
  tags?: string[];
  onTagClick?: (tag: string) => void;
  className?: string;
}

const TOPIC_TAGS = new Set([
  'financial',
  'legal',
  'intelligence',
  'forensic',
  'testimony',
  'timeline',
  'chain_of_custody',
]);

const NARRATIVE_TAGS = new Set([
  'coverup',
  'conspiracy',
  'official_narrative',
  'whistleblower',
  'controlled_opposition',
]);

const PATTERN_TAGS = new Set([
  'recurring_pattern',
  'coincidence',
  'contradiction',
  'corroboration',
]);

function getTagCategory(tag: string): 'topic' | 'narrative' | 'pattern' | 'custom' {
  if (TOPIC_TAGS.has(tag)) return 'topic';
  if (NARRATIVE_TAGS.has(tag)) return 'narrative';
  if (PATTERN_TAGS.has(tag)) return 'pattern';
  return 'custom';
}

function getTagBorderColor(category: 'topic' | 'narrative' | 'pattern' | 'custom'): string {
  switch (category) {
    case 'topic':
      return 'border-crt-info';
    case 'narrative':
      return 'border-crt-warning';
    case 'pattern':
      return 'border-crt-selection';
    case 'custom':
      return 'border-crt-accent';
  }
}

export function TagBadges({ tags = [], onTagClick, className = '' }: TagBadgesProps) {
  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map(tag => {
        const category = getTagCategory(tag);
        const borderColor = getTagBorderColor(category);
        const displayTag = tag.replace(/_/g, ' ');

        return (
          <button
            key={tag}
            onClick={() => onTagClick?.(tag)}
            className={`px-2 py-1 text-xs font-mono border ${borderColor} text-crt-fg hover:bg-crt-border hover:cursor-pointer transition-colors`}
            title={`${category} tag`}
          >
            [{displayTag}]
          </button>
        );
      })}
    </div>
  );
}
