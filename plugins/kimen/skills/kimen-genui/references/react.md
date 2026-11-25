# Mounting the renderer in React

`renderUiSpec` and `createLiveSurface` write into a DOM element you own. In
React that element is an empty `<div>` held by a ref, and the renderer runs
in an effect. The code below is for React 19; the same rules hold in any
framework with mount and unmount hooks.

## Rules

- React renders no children into the surface element. The renderer owns
  that element's children, and React would fight it for the same nodes. Put
  a loading state or a fallback next to the surface, never inside it.
- Render in an effect, never during render. In a framework with server
  components (the Next.js App Router), the component is a client component
  (`'use client'`).
- Register the components once, in client code at module level
  (`defineCustomElements()` from `@kimen/elements/loader`, see
  `catalog-direct.md`), not inside the component.
- Pass a stable `spec`. Every successful render replaces the whole tree, so
  what the person typed, focus and scroll are lost. Keep the parsed spec in
  state and parse once when the model answers, not on every render.
- Read callbacks through a ref, so a parent that passes a new `onAction`
  function on every render does not render the spec again. On React 19.2 or
  later, `useEffectEvent` does the same job.

## One spec at a time: `renderUiSpec`

```tsx
import { type ActionEvent, type RenderDiagnostic, renderUiSpec } from '@kimen/catalog';
import { useEffect, useLayoutEffect, useRef } from 'react';

interface GenUiSurfaceProps {
  /** A parsed spec. Keep the same object across renders: a new object renders again. */
  spec: unknown;
  onAction: (event: ActionEvent) => void;
  onRejected?: (diagnostics: readonly RenderDiagnostic[]) => void;
}

export function GenUiSurface({ spec, onAction, onRejected }: GenUiSurfaceProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);

  // The latest callbacks, read when they are needed: a parent that passes a
  // new function on every render does not render the spec again.
  const latest = useRef({ onAction, onRejected });
  useLayoutEffect(() => {
    latest.current = { onAction, onRejected };
  });

  // Unmount only: empty the surface. It is not in the spec effect, whose
  // cleanup runs before every new spec.
  useEffect(() => {
    const surface = surfaceRef.current;
    return () => surface?.replaceChildren();
  }, []);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (surface === null) return;
    const result = renderUiSpec(spec, {
      surface,
      onAction: (event) => latest.current.onAction(event),
    });
    if (!result.ok) latest.current.onRejected?.(result.diagnostics);
  }, [spec]);

  // React renders nothing into this element: the renderer owns its children.
  return <div ref={surfaceRef} />;
}
```

- **A rejected spec** comes back as the result (`ok: false` with
  `diagnostics`). Nothing is thrown and nothing is written. On the first
  render the surface stays empty. On a later render the previous tree stays
  in place, still interactive, and its actions still reach `onAction`. If
  stale UI must not stay, empty the surface yourself
  (`surface.replaceChildren()`) and show a fallback next to it.
- **Unmount** empties the surface once, in the cleanup of the effect with no
  dependencies. Never empty it in the cleanup of the effect that depends on
  `spec`: that cleanup runs before every new spec, so a rejected spec would
  leave an empty surface instead of the previous content. The renderer has
  no dispose call. Its listeners live on the rendered elements and go with
  them, and an action the rate budget is still holding is dropped once its
  node has left the surface.
- **StrictMode** runs every effect twice in development: setup, cleanup,
  setup. Here that empties the surface and renders the spec again.
  `renderUiSpec` replaces the surface's content in one operation, so the
  result is one tree, never two.

## A surface that changes in place: `createLiveSurface`

Use a live surface when the agent changes the UI after the first render and
what the person typed must survive. It needs its own pattern, because a live
surface keeps state the DOM does not show: the nodes it inserted, their ids
and a revision. Its options (`actions`, `catalog`, `allowedUrlOrigins`,
budgets) are fixed when it is created.

```tsx
import {
  createLiveSurface,
  type LiveActionEvent,
  type LiveBatch,
  type LiveBatchResult,
  type LiveSurface,
  type RenderDiagnostic,
} from '@kimen/catalog';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

interface LiveSurfaceOptions {
  /** The actions the surface accepts. A new array creates a new surface. */
  actions: readonly string[];
  /** The content of a new surface. A new batch creates a new surface. */
  initial: LiveBatch;
  onAction: (event: LiveActionEvent) => void;
  onRejected?: (diagnostics: readonly RenderDiagnostic[]) => void;
}

export function useLiveSurface({ actions, initial, onAction, onRejected }: LiveSurfaceOptions) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<LiveSurface | null>(null);
  const latest = useRef({ onAction, onRejected });
  useLayoutEffect(() => {
    latest.current = { onAction, onRejected };
  });

  useEffect(() => {
    const surface = surfaceRef.current;
    if (surface === null) return;
    const live = createLiveSurface({
      surface,
      actions,
      onAction: (event) => latest.current.onAction(event),
    });
    const first = live.apply(initial);
    if (!first.ok) latest.current.onRejected?.(first.diagnostics);
    liveRef.current = live;
    return () => {
      liveRef.current = null;
      // A new surface never adopts the old one's nodes: remove them.
      surface.replaceChildren();
    };
  }, [actions, initial]);

  // Undefined while no surface is mounted.
  const apply = useCallback(
    (batch: unknown): LiveBatchResult | undefined => liveRef.current?.apply(batch),
    [],
  );

  return { surfaceRef, apply };
}
```

```tsx
// Module constants: stable across renders.
const ACTIONS = ['task.add', 'task.remove'];
const INITIAL: LiveBatch = { ops: [{ op: 'insert', node: taskListNode }] };

function Tasks({ onAction }: { onAction: (event: LiveActionEvent) => void }) {
  const { surfaceRef, apply } = useLiveSurface({ actions: ACTIONS, initial: INITIAL, onAction });
  useEffect(
    // subscribeToAgent is your transport: it returns its own unsubscribe.
    () =>
      subscribeToAgent((batch) => {
        const result = apply(batch); // undefined: no surface mounted, nothing applied
        if (result !== undefined && !result.ok) console.warn(result.diagnostics);
      }),
    [apply],
  );
  return <div ref={surfaceRef} />;
}
```

- **One surface per mounted element.** Create it in an effect and drop it in
  the cleanup. The cleanup must also empty the element: a live surface only
  touches the nodes it inserted, so a second surface on the same element
  adds its nodes next to the first one's. Without that line, StrictMode
  leaves two copies of the content.
- **Every new surface starts empty, at revision 0.** The hook applies
  `initial` each time it creates one, so StrictMode's second setup shows the
  same content at the same revision. After a real remount, the batches the
  agent sent to the old surface are gone: apply them again from your own
  record, or have the agent start over. A batch's `ifRevision` is checked
  against the new surface's revision.
- **Stable options.** `actions` and `initial` are effect dependencies: pass
  module constants or memoized values. A new array or batch creates a new
  surface and drops what the person typed.
- **`apply` never throws for a bad batch.** A rejection is its return value
  and leaves earlier batches applied. It returns `undefined` while no
  surface is mounted, and that batch was not applied.

`createStreamingRenderer` also appends what it renders, so it follows the
live pattern: create it in the effect, empty the element in the cleanup, and
push the chunks received so far again after a remount.
