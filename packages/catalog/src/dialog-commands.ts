/** The catalog's local dialog invokers and renderer-owned DOM identifiers. */

export const DIALOG_TAG = 'ki-dialog';

export function isDialogInvoker(component: string): boolean {
  return component === 'ki-button' || component === 'ki-icon-button';
}

export function isDialogCommand(value: unknown): boolean {
  return value === 'show-modal' || value === 'close' || value === 'request-close';
}

let dialogSequence = 0;

/**
 * IDs from a neutral spec never reach the DOM. A renderer allocates its own
 * IDs and skips any already used in the host document or the surface's tree.
 */
export function allocateDialogId(surface: Element): string {
  const root = surface.getRootNode() as Document | DocumentFragment | Element;
  let id: string;
  do {
    dialogSequence += 1;
    id = `kimen-command-target-${String(dialogSequence)}`;
  } while (
    surface.ownerDocument.getElementById(id) !== null ||
    ('id' in root && root.id === id) ||
    (root !== surface.ownerDocument && root.querySelector(`#${id}`) !== null)
  );
  return id;
}

export type DialogIdFor = (id: string) => string | undefined;

/**
 * Writes the renderer-allocated DOM id of a node another node targets: a
 * dialog a command opens, or a node a reference prop names (spec 152). The
 * allocator decides which nodes are targets; it yields nothing for the rest,
 * so a node no one references never carries an id.
 */
export function writeDialogId(
  element: Element,
  nodeId: string | undefined,
  idFor: DialogIdFor,
): void {
  if (nodeId !== undefined) {
    const id = idFor(nodeId);
    if (id !== undefined) {
      element.setAttribute('id', id);
    }
  }
}
