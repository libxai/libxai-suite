# Scroll Behavior Configuration (v0.9.2)

## Overview

The `scrollBehavior` configuration provides professional, fine-grained control over how the Gantt chart viewport behaves during drag operations. This feature is essential for applications where users need precise control over the viewport position while interacting with tasks.

## Use Case

By default, browsers automatically scroll to keep dragged elements in view. While this is helpful in many contexts, it can be disruptive in Gantt charts where users want to:

- Drag tasks to dates outside the visible viewport without the viewport moving
- Maintain their current scroll position while organizing tasks
- Have full manual control over viewport scrolling via scrollbars or mouse wheel

## Interface

```typescript
interface GanttScrollBehavior {
  /**
   * Prevent automatic viewport scrolling during drag operations
   * When true, the viewport will not automatically center on dragged tasks
   * Users can still manually scroll using scrollbars or mouse wheel
   * @default false
   */
  preventAutoScroll?: boolean;

  /**
   * Which axis to prevent auto-scroll on
   * - 'horizontal': Only prevent horizontal auto-scroll (recommended for Gantt charts)
   * - 'vertical': Only prevent vertical auto-scroll
   * - 'both': Prevent both horizontal and vertical auto-scroll
   * @default 'horizontal'
   */
  axis?: 'horizontal' | 'vertical' | 'both';

  /**
   * Callback fired when auto-scroll is prevented
   * Useful for debugging or showing user feedback
   * @param axis - Which axis was prevented ('x' or 'y')
   * @param scrollDelta - How many pixels of scroll were prevented
   */
  onScrollPrevented?: (axis: 'x' | 'y', scrollDelta: number) => void;

  /**
   * Allow auto-scroll if task would go out of viewport bounds
   * When true, auto-scroll is only prevented if task remains visible
   * @default false
   */
  allowScrollWhenOutOfBounds?: boolean;
}
```

## Basic Usage

### Disable horizontal auto-scroll (recommended for Gantt charts)

```tsx
<GanttBoard
  tasks={tasks}
  config={{
    scrollBehavior: {
      preventAutoScroll: true,
      axis: 'horizontal'
    }
  }}
/>
```

### Disable all auto-scrolling

```tsx
<GanttBoard
  tasks={tasks}
  config={{
    scrollBehavior: {
      preventAutoScroll: true,
      axis: 'both'
    }
  }}
/>
```

### With event callback for debugging

```tsx
<GanttBoard
  tasks={tasks}
  config={{
    scrollBehavior: {
      preventAutoScroll: true,
      axis: 'horizontal',
      onScrollPrevented: (axis, scrollDelta) => {
        console.log(`Prevented ${axis} scroll by ${scrollDelta}px`);
        // Show user feedback
        toast.info(`Viewport locked during drag`);
      }
    }
  }}
/>
```

## Advanced Usage

### Production-ready configuration with logging

```tsx
import { useState } from 'react';
import { GanttBoard } from '@libxai/board';

function MyGanttApp() {
  const [scrollPreventCount, setScrollPreventCount] = useState(0);

  return (
    <GanttBoard
      tasks={tasks}
      config={{
        scrollBehavior: {
          preventAutoScroll: true,
          axis: 'horizontal',
          onScrollPrevented: (axis, scrollDelta) => {
            // Track how often scroll is prevented
            setScrollPreventCount(prev => prev + 1);

            // Log for analytics
            analytics.track('gantt_scroll_prevented', {
              axis,
              scrollDelta,
              timestamp: new Date().toISOString()
            });
          }
        }
      }}
    />
  );
}
```

### Conditional scroll prevention based on user preferences

```tsx
import { GanttBoard } from '@libxai/board';
import { useUserPreferences } from './hooks';

function MyGanttApp() {
  const { preferences } = useUserPreferences();

  return (
    <GanttBoard
      tasks={tasks}
      config={{
        scrollBehavior: preferences.enableScrollLock ? {
          preventAutoScroll: true,
          axis: 'horizontal',
          onScrollPrevented: (axis, scrollDelta) => {
            console.log(`Scroll locked per user preference`);
          }
        } : undefined
      }}
    />
  );
}
```

## Migration Guide

### From `disableScrollSync` (v0.9.1) to `scrollBehavior` (v0.9.2)

**Before (v0.9.1):**
```tsx
<GanttBoard
  config={{
    disableScrollSync: true  // ❌ Deprecated
  }}
/>
```

**After (v0.9.2):**
```tsx
<GanttBoard
  config={{
    scrollBehavior: {  // ✅ Professional solution
      preventAutoScroll: true,
      axis: 'horizontal'
    }
  }}
/>
```

**Note:** `disableScrollSync` is still supported for backward compatibility but is deprecated. Please migrate to `scrollBehavior` for better control and event callbacks.

## Architecture

### Implementation Details

The scroll prevention is implemented at the TaskBar component level using event capture:

1. **Event Capture Phase**: Scroll events are intercepted using `{ capture: true, passive: false }`
2. **Position Locking**: Original scroll positions are saved when drag starts
3. **Event Prevention**: Any scroll events during drag are prevented and positions are restored
4. **Cleanup**: Event listeners are removed when drag ends

### Performance

- **Minimal overhead**: Only active during drag operations
- **Event capture**: Prevents scroll before any other handlers run
- **Optimized cleanup**: Event listeners are properly removed to prevent memory leaks

### Browser Compatibility

This feature works in all modern browsers that support:
- `Element.closest()` (all modern browsers)
- `addEventListener` with `capture` and `passive` options (all modern browsers)
- Event prevention with `preventDefault()` (all browsers)

## Troubleshooting

### Scroll prevention not working

**Problem**: Scroll still happens during drag

**Solutions**:
1. Ensure `preventAutoScroll` is set to `true`
2. Check that `scrollBehavior` is passed to `GanttBoard` config
3. Verify the gantt container has the `data-gantt-chart` attribute (this should be automatic)
4. Check browser console for any errors

### Vertical scroll also prevented when only horizontal should be

**Problem**: Can't scroll vertically during drag

**Solution**: Ensure `axis` is set to `'horizontal'` (not `'both'`)

```tsx
scrollBehavior: {
  preventAutoScroll: true,
  axis: 'horizontal'  // ✅ Correct
}
```

### Callback not firing

**Problem**: `onScrollPrevented` callback is not being called

**Solutions**:
1. Ensure auto-scroll is actually being prevented (try dragging to an off-screen date)
2. Check that the callback is properly defined
3. Verify TypeScript types are correct

## Best Practices

1. **Use horizontal-only prevention**: For most Gantt charts, only prevent horizontal scroll:
   ```tsx
   axis: 'horizontal'  // ✅ Recommended
   ```

2. **Provide user feedback**: Use the callback to show users when scroll is locked:
   ```tsx
   onScrollPrevented: () => toast.info('Viewport locked during drag')
   ```

3. **Make it configurable**: Allow users to toggle scroll lock in settings:
   ```tsx
   preventAutoScroll: userPreferences.lockScrollDuringDrag
   ```

4. **Log for analytics**: Track usage to understand how users interact:
   ```tsx
   onScrollPrevented: (axis, delta) => analytics.track('scroll_prevented', { axis, delta })
   ```

## Examples

See the `examples/` directory for complete working examples:
- `examples/basic-scroll-lock.tsx` - Basic usage
- `examples/advanced-scroll-behavior.tsx` - Advanced configuration with analytics
- `examples/user-preferences.tsx` - Integrating with user settings

## API Reference

For complete API documentation, see the TypeScript definitions in `types.ts`.

## Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/libxai-suite/issues
- Documentation: https://docs.libxai.com
- Discord: https://discord.gg/libxai

## License

This feature is part of the LibXAI Board package and follows the same license.
