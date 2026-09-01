/**
 * FileCell - File custom field cell for ListView
 *
 * ── WHY THIS IS NOT AN UPLOADER ───────────────────────────────────────────
 *
 * A table cell is the wrong place to upload a file. Uploading needs a drop
 * area, a progress bar and room to report a failure — none of which fits in a
 * row that is 32 pixels tall and shares the screen with twelve other columns.
 * `AttachmentUploader` already does all of that properly.
 *
 * So this cell SHOWS what is attached and opens it. Adding a file happens
 * where there is room for it: the task panel. `onOpen` lets the host decide
 * what "open" means — its own drawer, a new tab, a preview.
 *
 * Deliberately no delete either: removing a file from a cell, with no
 * confirmation and no undo, one careless click away from the row below.
 */

import { Paperclip } from 'lucide-react';
import { cn } from '../../../utils';

export interface FileCellItem {
  id: string;
  name: string;
  url?: string;
}

interface FileCellProps {
  /**
   * Accepts both shapes a custom field can hold: a list of files, or a bare
   * URL string for the simple "one link to a document" case.
   */
  value?: FileCellItem[] | string;
  isDark: boolean;
  placeholder?: string;
  /** Called with the file the user clicked. Without it the cell is read-only. */
  onOpen?: (file: FileCellItem) => void;
}

function normalize(value: FileCellItem[] | string | undefined): FileCellItem[] {
  if (!value) return [];
  if (typeof value === 'string') {
    /* A bare URL: the last path segment is the closest thing to a name. */
    const name = value.split('/').filter(Boolean).pop() || value;
    return [{ id: value, name, url: value }];
  }
  return value.filter(f => f && f.id);
}

export function FileCell({
  value,
  isDark,
  placeholder = '-',
  onOpen,
}: FileCellProps) {
  const files = normalize(value);

  if (files.length === 0) {
    return (
      <span className={cn('text-sm', isDark ? 'text-white/30' : 'text-gray-400')}>
        {placeholder}
      </span>
    );
  }

  const first = files[0]!;
  const rest = files.length - 1;

  /*
   * The count goes in the label rather than showing every file: three columns
   * of chips is how a table stops being readable. The full list lives in the
   * task panel, where there is room for it.
   */
  const label = rest > 0 ? `${first.name} +${rest}` : first.name;

  if (!onOpen) {
    return (
      <span className={cn(
        'text-sm truncate flex items-center gap-1.5',
        isDark ? 'text-white/60' : 'text-gray-500',
      )}>
        <Paperclip className="w-3 h-3 flex-shrink-0" />
        {label}
      </span>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onOpen(first);
      }}
      title={files.map(f => f.name).join('\n')}
      className={cn(
        'text-sm truncate text-left w-full px-2 py-1 rounded transition-colors flex items-center gap-1.5',
        isDark
          ? 'text-white/60 hover:bg-white/[0.05]'
          : 'text-gray-500 hover:bg-gray-100',
      )}
    >
      <Paperclip className="w-3 h-3 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
