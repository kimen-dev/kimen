/**
 * Moves an element under a new parent placed where the element was: one
 * disconnect followed by one connect, in the same task. That is what a keyed
 * reorder in a framework, a drag between two lists or a portal does to a
 * mounted component. A spec that mounts from markup and never moves the
 * element does not exercise it, and a component that arms its observers and
 * listeners once, on load, stops working there.
 */
export function moveToNewParent(element: HTMLElement): HTMLElement {
  const parent = document.createElement('div');
  element.after(parent);
  parent.append(element);
  return parent;
}
