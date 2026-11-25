const NON_BREAKING_SPACE = " ";

function formatPercentage(part: number, total: number): string {
  return `${Math.round((part / total) * 100)}${NON_BREAKING_SPACE}%`;
}

export function describeRate(
  part: number,
  total: number,
  emptyLabel: string,
): string {
  if (total === 0) {
    return emptyLabel;
  }
  return `${formatPercentage(part, total)} (${part} de ${total})`;
}

export function describeCountWithShare(
  part: number,
  total: number,
  emptyLabel: string,
): string {
  if (total === 0) {
    return emptyLabel;
  }
  return `${part} de ${total} (${formatPercentage(part, total)})`;
}

export const NO_EVALUATIONS_LABEL = "Sin evaluaciones";

export function describeEvaluatedShare(part: number, total: number): string {
  if (total === 0) {
    return NO_EVALUATIONS_LABEL;
  }
  return `${part} de ${total} evaluados`;
}
