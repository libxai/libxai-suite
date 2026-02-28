/**
 * BlockersCell - Blocker badges for Chronos V2.0
 * Shows: RFI #402 (red), Pending (amber), etc.
 */

import { cn } from '../../../utils';

interface Blocker {
  type: string;
  id: string;
  severity: 'critical' | 'warning' | 'info';
}

interface BlockersCellProps {
  blockers?: Blocker[];
  isDark: boolean;
  locale?: string;
}

const SEVERITY_STYLES = {
  critical: 'bg-[#FF453A]/15 text-[#FF453A]',
  warning: 'bg-[#FFD60A]/15 text-[#FFD60A]',
  info: 'bg-[#007BFF]/15 text-[#007BFF]',
};

export function BlockersCell({
  blockers,
  isDark,
  locale = 'en',
}: BlockersCellProps) {
  if (!blockers || blockers.length === 0) {
    return (
      <span className={cn(
        'text-[9px] font-mono uppercase tracking-wide',
        isDark ? 'text-white/20' : 'text-gray-400'
      )}>
        {locale === 'es' ? 'Ninguno' : 'None'}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {blockers.map((blocker, i) => (
        <span
          key={`${blocker.type}-${blocker.id}-${i}`}
          className={cn(
            'px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide whitespace-nowrap',
            SEVERITY_STYLES[blocker.severity]
          )}
        >
          {blocker.type} #{blocker.id}
        </span>
      ))}
    </div>
  );
}
