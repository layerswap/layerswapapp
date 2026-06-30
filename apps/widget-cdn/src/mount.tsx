import { createRoot } from 'react-dom/client';
import Widget, { type WidgetProps } from './Widget';

/** Handle returned by `mount` for updating props or tearing down. */
export type WidgetHandle = {
  update(props: WidgetProps): void;
  destroy(): void;
};

/**
 * Imperative mount entry for non-React hosts.
 *
 * Owns its own React root so the host needs no React at all.
 * Framework-agnostic loaders load this expose (`./mount`) and call it; React
 * hosts use the `./Widget` expose instead and share the host's React.
 */
export default function mount(target: HTMLElement, props: WidgetProps): WidgetHandle {
  const root = createRoot(target);
  root.render(<Widget {...props} />);
  return {
    update(next: WidgetProps) {
      root.render(<Widget {...next} />);
    },
    destroy() {
      root.unmount();
    },
  };
}
