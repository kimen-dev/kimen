/** Scroll heights are rounded, while the current scroll offset can be fractional. */
export function isAtConversationEnd(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
): boolean {
  return scrollHeight - clientHeight - scrollTop <= 1;
}
