export const LIST_PARAMETERS = {
  search: "buscar",
  sort: "orden",
  page: "pagina",
  pageSize: "filas",
} as const;

export const PAGE_SIZE_OPTIONS = [50, 100, 150] as const;
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const LOCALE = "es-AR";

export type ListPage<Item> = {
  items: Item[];
  totalCount: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

export type Comparator<Item> = (first: Item, second: Item) => number;

function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase(LOCALE);
}

export function compareText(first: string, second: string): number {
  return first.localeCompare(second, LOCALE);
}

// shortcut: filtra y pagina en memoria porque las listas de acceso son chicas; pasar a SQL si superan los miles.
export function paginateList<Item, SortKey extends string>(
  items: Item[],
  { search, sort, page, pageSize }: ListQuery<SortKey>,
  searchableText: (item: Item) => string,
  comparators: Record<SortKey, Comparator<Item>>,
): ListPage<Item> {
  const normalizedSearch = normalizeForSearch(search);
  const compare = comparators[sort.key];
  const matchingItems = items
    .filter((item) =>
      normalizeForSearch(searchableText(item)).includes(normalizedSearch),
    )
    .sort((first, second) =>
      sort.isDescending ? compare(second, first) : compare(first, second),
    );

  const pageCount = Math.max(1, Math.ceil(matchingItems.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  return {
    items: matchingItems.slice(pageStart, pageStart + pageSize),
    totalCount: matchingItems.length,
    page: currentPage,
    pageCount,
    pageSize,
  };
}

export type ListSort<SortKey extends string> = {
  key: SortKey;
  isDescending: boolean;
};

export type ListQuery<SortKey extends string> = {
  search: string;
  sort: ListSort<SortKey>;
  page: number;
  pageSize: number;
};

const DESCENDING_PREFIX = "-";

const FIRST_PAGE = 1;

export function formatListSort({
  key,
  isDescending,
}: ListSort<string>): string {
  return isDescending ? `${DESCENDING_PREFIX}${key}` : key;
}

function parseListSort<SortKey extends string>(
  value: string | undefined,
  sortKeys: readonly SortKey[],
  defaultSort: ListSort<SortKey>,
): ListSort<SortKey> {
  const isDescending = value?.startsWith(DESCENDING_PREFIX) ?? false;
  const key = isDescending ? value?.slice(DESCENDING_PREFIX.length) : value;
  const sortKey = sortKeys.find((candidate) => candidate === key);
  return sortKey ? { key: sortKey, isDescending } : defaultSort;
}

export type SearchParams = Record<string, string | string[] | undefined>;

export function readSearchParam(
  searchParams: SearchParams,
  name: string,
): string | undefined {
  const value = searchParams[name];
  return Array.isArray(value) ? value[0] : value;
}

function parsePageSize(value: string | undefined): number {
  return (
    PAGE_SIZE_OPTIONS.find((option) => String(option) === value) ??
    DEFAULT_PAGE_SIZE
  );
}

function parsePage(value: string | undefined): number {
  const pageNumber = Number(value);
  return Number.isInteger(pageNumber) && pageNumber >= FIRST_PAGE
    ? pageNumber
    : FIRST_PAGE;
}

export function parseListQuery<SortKey extends string>(
  searchParams: SearchParams,
  sortKeys: readonly SortKey[],
  defaultSort: ListSort<SortKey>,
): ListQuery<SortKey> {
  return {
    search: readSearchParam(searchParams, LIST_PARAMETERS.search)?.trim() ?? "",
    sort: parseListSort(
      readSearchParam(searchParams, LIST_PARAMETERS.sort),
      sortKeys,
      defaultSort,
    ),
    page: parsePage(readSearchParam(searchParams, LIST_PARAMETERS.page)),
    pageSize: parsePageSize(
      readSearchParam(searchParams, LIST_PARAMETERS.pageSize),
    ),
  };
}
