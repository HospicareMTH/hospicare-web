import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createCatalogOptionAction } from "../actions";
import { createHealthcareProfessionalAction } from "../professionals/actions";
import type { SelectableCatalogEntry } from "../selection";
import {
  CatalogOptionPicker,
  type CatalogSelectionMode,
} from "./catalog-option-picker";

vi.mock("../actions", () => ({ createCatalogOptionAction: vi.fn() }));
vi.mock("../professionals/actions", () => ({
  createHealthcareProfessionalAction: vi.fn(),
}));

const RELIGION_OPTIONS: SelectableCatalogEntry[] = [
  { id: "id-ninguna", label: "Ninguna", isActive: true },
  { id: "id-judio", label: "Judío", isActive: true },
  { id: "id-mormon", label: "Mormón", isActive: false },
];

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.mocked(createCatalogOptionAction).mockReset();
  vi.mocked(createHealthcareProfessionalAction).mockReset();
});

function renderPicker({
  selectionMode = "single",
  value = [],
  canCreate = true,
  catalog = "religion",
}: {
  selectionMode?: CatalogSelectionMode;
  value?: string[];
  canCreate?: boolean;
  catalog?: "religion" | "healthcareProfessionals";
} = {}) {
  const onValueChange = vi.fn();
  render(
    <CatalogOptionPicker
      catalog={catalog}
      options={RELIGION_OPTIONS}
      selectionMode={selectionMode}
      value={value}
      onValueChange={onValueChange}
      canCreate={canCreate}
    />,
  );
  fireEvent.click(screen.getByRole("combobox"));
  return onValueChange;
}

function search(text: string) {
  fireEvent.change(screen.getByPlaceholderText("Buscar…"), {
    target: { value: text },
  });
}

describe("selector de opciones de catálogo", () => {
  it("elige una opción y busca sin distinguir acentos", () => {
    const onValueChange = renderPicker();

    search("judio");
    fireEvent.click(screen.getByRole("option", { name: "Judío" }));

    expect(onValueChange).toHaveBeenCalledWith(["id-judio"]);
  });

  it("RF-CAT-02: muestra como inactiva la opción ya guardada", () => {
    renderPicker({ value: ["id-mormon"] });

    expect(screen.getAllByText("Mormón (inactiva)")).not.toHaveLength(0);
    expect(screen.getByRole("option", { name: /Mormón/ })).toHaveTextContent(
      "Inactiva",
    );
  });

  it("RF-CAT-04: crea desde el formulario y deja elegida la opción en selección única", async () => {
    vi.mocked(createCatalogOptionAction).mockResolvedValue({
      status: "success",
      wasReactivated: false,
      optionId: "id-budista",
    });
    const onValueChange = renderPicker();

    search("Budista");
    fireEvent.click(screen.getByRole("option", { name: /Crear «Budista»/ }));

    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith(["id-budista"]),
    );
    expect(createCatalogOptionAction).toHaveBeenCalledWith("religion", {
      label: "Budista",
      description: "",
    });
  });

  it("RF-CAT-04: en selección múltiple marca la opción creada sin quitar las elegidas", async () => {
    vi.mocked(createHealthcareProfessionalAction).mockResolvedValue({
      status: "success",
      wasReactivated: false,
      professionalId: "id-laura",
    });
    const onValueChange = renderPicker({
      selectionMode: "multiple",
      value: ["id-ninguna"],
      catalog: "healthcareProfessionals",
    });

    search("Laura Ficticia");
    fireEvent.click(
      screen.getByRole("option", { name: /Crear «Laura Ficticia»/ }),
    );

    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith(["id-ninguna", "id-laura"]),
    );
    expect(createHealthcareProfessionalAction).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: "Laura Ficticia" }),
    );
  });

  it("RF-CAT-04: sin permiso de crear no ofrece crear la opción", () => {
    renderPicker({ canCreate: false });

    search("Budista");

    expect(
      screen.queryByRole("option", { name: /Crear/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("No hay opciones que coincidan."),
    ).toBeInTheDocument();
  });

  it("RF-CAT-06: no ofrece crear una opción que ya existe con otros acentos", () => {
    renderPicker();

    search("JUDIO");

    expect(
      screen.queryByRole("option", { name: /Crear/ }),
    ).not.toBeInTheDocument();
  });
});
