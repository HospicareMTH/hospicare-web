import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ADMIN_SECTIONS } from "../sections";
import { AdminSectionNav } from "./admin-section-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/actividad",
}));

const NAVIGATION_BOUNDS = { left: 0, width: 300 };
const CURRENT_SECTION_BOUNDS = { left: 600, width: 200 };
const ROW_HEIGHT = 40;

describe("AdminSectionNav", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("RF-UX-04: desplaza la fila hasta centrar la sección actual", () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        const bounds =
          this.getAttribute("aria-current") === "page"
            ? CURRENT_SECTION_BOUNDS
            : NAVIGATION_BOUNDS;
        return DOMRect.fromRect({
          x: bounds.left,
          y: 0,
          width: bounds.width,
          height: ROW_HEIGHT,
        });
      },
    );

    render(<AdminSectionNav sections={[...ADMIN_SECTIONS]} />);

    const navigation = screen.getByRole("navigation", {
      name: "Secciones de Administración",
    });
    expect(
      screen.getByRole("link", { name: "Registro de actividad" }),
    ).toHaveAttribute("aria-current", "page");
    expect(navigation.scrollLeft).toBe(550);
  });
});
