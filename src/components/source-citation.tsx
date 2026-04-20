import { useState, useRef, useEffect } from 'react';
import type { Source } from '../lib/types';

interface SourceCitationProps {
  source: Source;
  index: number;
}

export function SourceCitation({ source, index }: SourceCitationProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const markerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (showTooltip && markerRef.current) {
      const rect = markerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: rect.left + window.scrollX,
        y: rect.bottom + window.scrollY + 5,
      });
    }
  }, [showTooltip]);

  const props = source.properties;

  return (
    <>
      <sup
        ref={markerRef}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="text-rabbit-600 cursor-pointer hover:text-rabbit-700 font-bold"
      >
        [{index}]
      </sup>

      {showTooltip && (
        <div
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 max-w-xs"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="text-sm">
            <p className="font-semibold text-gray-900 mb-1">{props.title}</p>
            {props.publication && (
              <p className="text-gray-700 text-xs mb-1">
                <span className="font-medium">Publication:</span> {props.publication}
              </p>
            )}
            {props.author && (
              <p className="text-gray-700 text-xs mb-1">
                <span className="font-medium">Author:</span> {props.author}
              </p>
            )}
            {props.date && (
              <p className="text-gray-700 text-xs mb-1">
                <span className="font-medium">Date:</span> {props.date}
              </p>
            )}
            <p className="text-gray-600 text-xs mb-2">
              <span className="font-medium">Type:</span> {props.source_type}
            </p>
            {props.url && (
              <a
                href={props.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-rabbit-600 hover:text-rabbit-700 text-xs underline block"
              >
                Open source →
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
