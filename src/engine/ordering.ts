/** Locale-independent UTF-16 ordering for reproducible exports across hosts. */
export function compareText(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}
