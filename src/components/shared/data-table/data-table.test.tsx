import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable, type DataTableColumn } from "./data-table";

const push = vi.fn();
const searchParams = vi.hoisted(() => ({ value: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/usuarios",
  useSearchParams: () => new URLSearchParams(searchParams.value),
  useRouter: () => ({ push }),
}));
vi.mock("next/form", () => ({
  default: (props: ComponentProps<"form">) => <form {...props} />,
}));

type Person = { id: string; name: string; email: string };
type PersonSortKey = "name";

const COLUMNS: DataTableColumn<Person, PersonSortKey>[] = [
  {
    id: "name",
    label: "Nombre",
    sortKey: "name",
    canHide: false,
    cell: (person) => person.name,
  },
  { id: "email", label: "Correo", cell: (person) => person.email },
];

const PEOPLE: Person[] = [
  { id: "1", name: "Ana Ficticia", email: "ana@hospicare.test" },
  { id: "2", name: "Beto Ficticio", email: "beto@hospicare.test" },
];

function renderTable({
  search = "",
  page = 1,
  pageCount = 1,
  hiddenColumns = [] as string[],
  onHiddenColumnsChange = vi.fn(),
} = {}) {
  render(
    <DataTable
      columns={COLUMNS}
      page={{
        items: PEOPLE,
        totalCount: PEOPLE.length,
        page,
        pageCount,
        pageSize: 50,
      }}
      query={{
        search,
        sort: { key: "name", isDescending: false },
        page,
        pageSize: 50,
      }}
      defaultSort={{ key: "name", isDescending: false }}
      searchLabel="Buscar personas"
      emptyMessage="No hay personas."
      totalLabel="2 personas"
      paginationLabel="Páginas de personas"
      getRowActions={() => []}
      getActionsLabel={(person) => `Acciones de ${person.name}`}
      hiddenColumns={hiddenColumns}
      onHiddenColumnsChange={onHiddenColumnsChange}
    />,
  );
  return { onHiddenColumnsChange };
}

describe("DataTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams.value = "";
  });

  it("RF-TAB-06: respeta las columnas ocultas guardadas", () => {
    renderTable({ hiddenColumns: ["email"] });

    expect(
      screen.queryByRole("columnheader", { name: "Correo" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("ana@hospicare.test")).not.toBeInTheDocument();
  });

  it("RF-TAB-06: ocultar una columna la saca de la tabla y avisa para guardarla", () => {
    const { onHiddenColumnsChange } = renderTable();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Columnas" }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Correo" }));

    expect(onHiddenColumnsChange).toHaveBeenCalledWith(["email"]);
    expect(
      screen.queryByRole("columnheader", { name: "Correo" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitemcheckbox", { name: "Nombre" }),
    ).not.toBeInTheDocument();
  });

  it("RF-TAB-01: borra la búsqueda con su propio botón", () => {
    searchParams.value = "buscar=ana&pagina=2";
    renderTable({ search: "ana" });

    fireEvent.click(screen.getByRole("button", { name: "Borrar la búsqueda" }));

    expect(push).toHaveBeenCalledWith("/admin/usuarios");
    expect(
      screen.getByRole("searchbox", { name: "Buscar personas" }),
    ).toHaveValue("");
  });

  it("RF-TAB-01: pagina con enlaces y conserva los filtros", () => {
    searchParams.value = "buscar=ana";
    renderTable({ page: 2, pageCount: 3 });

    const pagination = screen.getByRole("navigation", {
      name: "Páginas de personas",
    });
    expect(
      within(pagination).getByRole("link", { name: "Ir a la página anterior" }),
    ).toHaveAttribute("href", "/admin/usuarios?buscar=ana");
    expect(
      within(pagination).getByRole("link", { name: "Página 3" }),
    ).toHaveAttribute("href", "/admin/usuarios?buscar=ana&pagina=3");
    expect(
      within(pagination).getByRole("link", { name: "Página 2" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
