import { type SQL, sql } from "drizzle-orm";

// Ñ queda distinta de N a propósito: en castellano es otra letra ("Año" no es "Ano").
const ACCENTED_LETTERS = "ÁÉÍÓÚÜÀÈÌÒÙÂÊÎÔÛÄËÏÖáéíóúüàèìòùâêîôûäëïö";
const UNACCENTED_LETTERS = "aeiouuaeiouaeiouaeioaeiouuaeiouaeiouaeio";

const LIKE_SPECIAL_CHARACTERS = /[\\%_]/g;
const LIKE_ESCAPED_MATCH = "\\$&";

export function normalizeTextSql(text: SQL): SQL {
  return sql`lower(translate(btrim(${text}), ${sql.raw(`'${ACCENTED_LETTERS}'`)}, ${sql.raw(`'${UNACCENTED_LETTERS}'`)}))`;
}

export function containsNormalizedTextSql(
  normalizedText: SQL,
  searchTerm: string,
): SQL {
  const escapedTerm = searchTerm.replace(
    LIKE_SPECIAL_CHARACTERS,
    LIKE_ESCAPED_MATCH,
  );
  return sql`${normalizedText} like ${normalizeTextSql(sql`${`%${escapedTerm}%`}`)}`;
}
