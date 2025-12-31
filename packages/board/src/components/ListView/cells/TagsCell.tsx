/**
 * TagsCell - Tags display cell for ListView
 */

import { cn } from '../../../utils';
import type { TaskTag } from '../../Gantt/types';

interface TagsCellProps {
  value?: TaskTag[];
  isDark: boolean;
  maxVisible?: number;
}

export function TagsCell({
  value = [],
  isDark,
  maxVisible = 2,
}: TagsCellProps) {
  if (value.length === 0) {
    return (
      <span className={cn('text-sm', isDark ? 'text-[#6B7280]' : 'text-gray-400')}>
        -
      </span>
    );
  }

  const visibleTags = value.slice(0, maxVisible);
  const remainingCount = value.length - maxVisible;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visibleTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center px-2 py-0.5 text-xs rounded-full"
          style={{
            backgroundColor: tag.color ? `${tag.color}20` : isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
            color: tag.color || (isDark ? '#9CA3AF' : '#6B7280'),
          }}
        >
          {tag.name}
        </span>
      ))}
      {remainingCount > 0 && (
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 text-xs rounded-full',
            isDark ? 'bg-white/10 text-[#9CA3AF]' : 'bg-gray-100 text-gray-500'
          )}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
}
