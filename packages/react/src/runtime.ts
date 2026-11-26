import { createElement, forwardRef, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { FunctionComponent, HTMLAttributes, RefAttributes } from 'react';

export type EventName<T extends Event = Event> = string & { __eventType: T };
type EventNames = Record<string, string>;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/consistent-type-definitions -- preserve the generated default event type
type NoEvents = {};
type StencilProps<I extends HTMLElement, E extends EventNames, C, R extends keyof C> = Omit<
  HTMLAttributes<I>,
  keyof E
> &
  Partial<{
    // Match the generated event type, including the fallback for an untyped name.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- preserve the wrapper's existing event signature
    [K in keyof E]: E[K] extends EventName<infer T> ? (event: T) => void : (event: any) => void;
  }> &
  Required<Pick<C, R>> &
  Partial<Omit<C, R>> &
  RefAttributes<I>;

export type StencilReactComponent<
  I extends HTMLElement,
  E extends EventNames = NoEvents,
  C = Omit<I, keyof HTMLElement>,
  R extends keyof C = never,
> = FunctionComponent<StencilProps<I, E, C, R>>;

const useCommitEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const reactOnly = new Set(['children', 'localName', 'style']);
const classTokens = (value: string): string[] => value.match(/\S+/gu) ?? [];

export function createComponent<
  I extends HTMLElement,
  E extends EventNames = NoEvents,
  C = Omit<I, keyof HTMLElement>,
  R extends keyof C = never,
>({
  tagName,
  elementClass,
  events,
  defineCustomElement,
}: {
  tagName: string;
  elementClass: { prototype: I };
  events: E;
  defineCustomElement: () => void;
}): StencilReactComponent<I, E, C, R> {
  defineCustomElement();
  const eventNames: EventNames = events;
  const eventName = (key: string) => (Object.hasOwn(events, key) ? eventNames[key] : undefined);

  const Component = forwardRef<I, StencilProps<I, E, C, R>>((props, ref) => {
    const host = useRef<I | null>(null);
    const previous = useRef<Record<string, unknown>>({});
    const listeners = useRef(new Map<string, EventListenerObject>());
    const previousClass = useRef('');
    const { className, class: legacyClass, ...rest } = props as Record<string, unknown>;
    const nextClass = (className ?? legacyClass ?? '') as string;
    const reactProps: Record<string, unknown> = {};
    const elementProps: Record<string, unknown> = {};
    for (const key of Object.keys(rest)) {
      const useProperty =
        !reactOnly.has(key) && (key in elementClass.prototype || eventName(key) !== undefined);
      (useProperty ? elementProps : reactProps)[key] = rest[key];
    }

    useCommitEffect(() => {
      const node = host.current;
      if (!node) return;
      const properties = node as unknown as Record<string, unknown>;
      const old = previous.current;
      for (const key of new Set([...Object.keys(elementProps), ...Object.keys(old)])) {
        const value = elementProps[key];
        const event = eventName(key);
        if (event) {
          const listener = listeners.current.get(event);
          if (typeof value === 'function') {
            // Keep the wrapper's registration separate from native listeners
            // that might use the same callback, and preserve listener order.
            if (listener) listener.handleEvent = value as EventListener;
            else {
              const registration = { handleEvent: value as EventListener };
              listeners.current.set(event, registration);
              node.addEventListener(event, registration);
            }
          } else if (listener) {
            node.removeEventListener(event, listener);
            listeners.current.delete(event);
          }
        } else {
          properties[key] = value;
          if (value == null && key in HTMLElement.prototype) node.removeAttribute(key);
        }
      }
      previous.current = elementProps;

      // Stencil also owns classes on the host, including hydration and scope markers.
      if (previousClass.current !== nextClass) {
        const desired = classTokens(nextClass);
        for (const token of classTokens(previousClass.current)) {
          if (!desired.includes(token)) node.classList.remove(token);
        }
        node.classList.add(...desired);
        previousClass.current = nextClass;
      }
    });

    useCommitEffect(() => {
      const node = host.current;
      if (!node) return;
      const registrations = listeners.current;
      node.removeAttribute('defer-hydration');
      return () => {
        for (const [event, listener] of registrations) node.removeEventListener(event, listener);
        registrations.clear();
      };
    }, []);

    const attach = useCallback(
      (node: I | null) => {
        host.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );
    return createElement(tagName, { ...reactProps, ref: attach, suppressHydrationWarning: true });
  });
  Component.displayName = tagName;
  return Component as unknown as StencilReactComponent<I, E, C, R>;
}
