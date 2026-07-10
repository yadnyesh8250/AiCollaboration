/**
 * Lexicographical positioning helper for Kanban drag-and-drop.
 * Calculates the midpoint between adjacent task positions, or appends/prepends positions.
 */

export function calculateNewPosition(
  prevPosition: number | null | undefined,
  nextPosition: number | null | undefined
): number {
  const DEFAULT_GAP = 1000;

  // Case 1: Dragging to an empty column
  if ((prevPosition === null || prevPosition === undefined) && (nextPosition === null || nextPosition === undefined)) {
    return DEFAULT_GAP;
  }

  // Case 2: Dragging to the very top (no prevPosition)
  if (prevPosition === null || prevPosition === undefined) {
    return (nextPosition as number) - DEFAULT_GAP;
  }

  // Case 3: Dragging to the very bottom (no nextPosition)
  if (nextPosition === null || nextPosition === undefined) {
    return (prevPosition as number) + DEFAULT_GAP;
  }

  // Case 4: Dragging between two tasks
  return (prevPosition + nextPosition) / 2;
}
