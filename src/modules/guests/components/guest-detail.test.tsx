import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { GuestView } from "../service";
import { GuestDetail } from "./guest-detail";

const GUEST: GuestView = {
  id: "00000000-0000-4000-8000-000000000001",
  clinicalRecordNumber: 7,
  fullName: "Persona Ficticia",
  firstName: "Persona",
  lastName: "Ficticia",
  birthDate: "1950-01-01",
  dni: "11222333",
  address: "Calle Ficticia 123",
  healthInsuranceLabel: null,
  healthInsuranceMemberNumber: null,
  hospitalizationDate: "2026-11-20",
  hospitalizationReasonLabels: ["Desgaste del cuidador principal"],
  otherHospitalizationReason: null,
  uncontrolledSymptomLabels: [],
  origin: "admission",
  admissionInterviewId: "00000000-0000-4000-8000-000000000002",
  createdAt: new Date("2026-11-20T12:00:00Z"),
  createdByName: "Ana Prueba",
  updatedAt: new Date("2026-11-20T12:00:00Z"),
  updatedByName: "Ana Prueba",
  annulment: null,
};

function valueOf(label: string): HTMLElement {
  const term = screen.getByText(label, { selector: "dt" });
  const value = term.nextElementSibling;
  if (!(value instanceof HTMLElement)) {
    throw new Error(`No hay valor para ${label}.`);
  }
  return value;
}

describe("GuestDetail", () => {
  it("RF-HUE-04: muestra los datos con formato y los vacíos como Sin cargar", () => {
    render(<GuestDetail guest={GUEST} interviewHref={null} />);

    expect(valueOf("DNI")).toHaveTextContent("11.222.333");
    expect(valueOf("Fecha de internación")).toHaveTextContent("20/11/2026");
    expect(valueOf("Obra social")).toHaveTextContent("Sin cargar");
    expect(valueOf("Síntomas no controlados")).toHaveTextContent("Sin cargar");
    expect(valueOf("Motivos de internación")).toHaveTextContent(
      "Desgaste del cuidador principal",
    );
    expect(valueOf("Origen")).toHaveTextContent("Admisión");
  });

  it("RF-HUE-02: con permiso de ver entrevistas, el origen enlaza a la entrevista", () => {
    render(
      <GuestDetail
        guest={GUEST}
        interviewHref="/admisiones/00000000-0000-4000-8000-000000000002"
      />,
    );

    expect(
      within(valueOf("Origen")).getByRole("link", {
        name: "Ver la entrevista",
      }),
    ).toHaveAttribute(
      "href",
      "/admisiones/00000000-0000-4000-8000-000000000002",
    );
  });
});
