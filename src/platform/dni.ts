const DNI_SEPARATORS = /[.\-\s]/g;

const dniFormatter = new Intl.NumberFormat("es-AR", { useGrouping: true });

export function removeDniSeparators(candidate: string): string {
  return candidate.replace(DNI_SEPARATORS, "");
}

export function formatDni(digits: string): string {
  return dniFormatter.format(Number(digits));
}
