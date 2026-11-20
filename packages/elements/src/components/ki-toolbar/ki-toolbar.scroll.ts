interface ToolbarScrollState {
  position: number;
  hidden: boolean;
}

/** Keep elastic overscroll outside the page from reversing the toolbar. */
export function toolbarScrollState(
  previous: ToolbarScrollState,
  offset: number,
  maximum: number,
  hasFocus: boolean,
): ToolbarScrollState {
  const position = Math.min(Math.max(0, offset), Math.max(0, maximum));
  const scrollingDown =
    position === previous.position ? previous.hidden : position > previous.position;
  return { position, hidden: !hasFocus && position > 0 && scrollingDown };
}
