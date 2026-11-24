export type SelectionChanges = { addedIds: string[]; removedIds: string[] };

export function findAddedAndRemoved(
  savedIds: readonly string[],
  nextIds: readonly string[],
): SelectionChanges {
  return {
    addedIds: nextIds.filter((id) => !savedIds.includes(id)),
    removedIds: savedIds.filter((id) => !nextIds.includes(id)),
  };
}
