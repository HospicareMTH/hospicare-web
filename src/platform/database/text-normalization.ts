import { type SQL, sql } from "drizzle-orm";

// Ñ queda distinta de N a propósito: en castellano es otra letra ("Año" no es "Ano").
const ACCENTED_LETTERS = "ÁÉÍÓÚÜÀÈÌÒÙÂÊÎÔÛÄËÏÖáéíóúüàèìòùâêîôûäëïö";
const UNACCENTED_LETTERS = "aeiouuaeiouaeiouaeioaeiouuaeiouaeiouaeio";

export function normalizeTextSql(text: SQL): SQL {
  return sql`lower(translate(btrim(${text}), ${sql.raw(`'${ACCENTED_LETTERS}'`)}, ${sql.raw(`'${UNACCENTED_LETTERS}'`)}))`;
}
