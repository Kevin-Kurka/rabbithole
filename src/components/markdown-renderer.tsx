import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import type { Claim } from '../lib/types';
import type { ReactNode } from 'react';

interface MarkdownRendererProps {
  content: string;
  claims?: Claim[];
  onClaimClick?: (claimId: string) => void;
  className?: string;
}

interface CodeComponentProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: ReactNode;
  [key: string]: any;
}

export function MarkdownRenderer({ content, claims = [], onClaimClick, className = '' }: MarkdownRendererProps) {
  // Create a map of claim text to ID for quick lookup
  const claimMap = new Map(claims.map(c => [c.properties.text.toLowerCase(), c.id]));

  return (
    <div className={`prose prose-sm max-w-none ${className}`} data-color-mode="light">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ inline, className: codeClassName, children, ...props }: CodeComponentProps) => {
            const match = (codeClassName || '').match(/language-(\w+)/);
            if (!inline && match) {
              return (
                <SyntaxHighlighter
                  style={nord}
                  language={match[1]}
                  PreTag="div"
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              );
            }
            return (
              <code className={`${codeClassName || ''} bg-gray-100 px-1.5 py-0.5 rounded text-sm`} {...props}>
                {children}
              </code>
            );
          },
          mark: ({ children }) => {
            const text = String(children).toLowerCase();
            const claimId = claimMap.get(text);
            return (
              <mark
                className="bg-yellow-200 cursor-pointer hover:bg-yellow-300 transition-colors px-1 rounded"
                onClick={() => claimId && onClaimClick?.(claimId)}
                title={claimId ? 'Click to view claim details' : ''}
              >
                {children}
              </mark>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
