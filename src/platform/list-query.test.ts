import { describe, expect, it } from "vitest";

import {
  compareText,
  DEFAULT_PAGE_SIZE,
  paginateList,
  parseListQuery,
} from "./list-query";

const SORT_KEYS = ["name"] as const;
const DEFAULT_SORT = { key: "name", isDescending: false } as const;
const NAMES = Array.from(
  { length: 120 },
  (_, index) => `Persona ${String(index + 1).padStart(3, "0")}`,
);

describe("listados", () => {
  it("RF-TAB-01: usa 50 filas por defecto y acepta 100 o 150", () => {
    expect(parseListQuery({}, SORT_KEYS, DEFAULT_SORT).pageSize).toBe(
      DEFAULT_PAGE_SIZE,
    );
    expect(
      parseListQuery({ filas: "100" }, SORT_KEYS, DEFAULT_SORT).pageSize,
    ).toBe(100);
    expect(
      parseListQuery({ filas: "150" }, SORT_KEYS, DEFAULT_SORT).pageSize,
    ).toBe(150);
    expect(
      parseListQuery({ filas: "10" }, SORT_KEYS, DEFAULT_SORT).pageSize,
    ).toBe(DEFAULT_PAGE_SIZE);
  });

  it("RF-TAB-01: pagina según la cantidad de filas elegida", () => {
    const query = parseListQuery(
      { filas: "100", pagina: "2" },
      SORT_KEYS,
      DEFAULT_SORT,
    );

    const page = paginateList(NAMES, query, (name) => name, {
      name: compareText,
    });

    expect(page).toMatchObject({
      totalCount: 120,
      page: 2,
      pageCount: 2,
      pageSize: 100,
    });
    expect(page.items).toHaveLength(20);
    expect(page.items[0]).toBe("Persona 101");
  });
});
