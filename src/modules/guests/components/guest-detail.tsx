import Link from "next/link";
import type { ReactNode } from "react";

import { type DetailItem, DetailList } from "@/components/shared/detail-list";
import { formatIsoDate } from "@/platform/dates";
import { formatDni } from "@/platform/dni";

import { GUEST_ORIGIN_LABELS } from "../schemas";
import type { GuestView } from "../service";

function DetailSection({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: DetailItem[];
}) {
  const titleId = `guest-detail-${id}-title`;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <h2 id={titleId} className="text-lg font-semibold">
        {title}
      </h2>
      <DetailList items={items} />
    </section>
  );
}

function describeOrigin(
  guest: GuestView,
  interviewHref: string | null,
): ReactNode {
  const originLabel = GUEST_ORIGIN_LABELS[guest.origin];
  if (!interviewHref) {
    return originLabel;
  }
  return (
    <>
      {originLabel}.{" "}
      <Link
        href={interviewHref}
        className="font-medium text-primary underline underline-offset-4"
      >
        Ver la entrevista
      </Link>
    </>
  );
}

export function GuestDetail({
  guest,
  interviewHref,
}: {
  guest: GuestView;
  interviewHref: string | null;
}) {
  return (
    <div className="flex flex-col gap-8">
      <DetailSection
        id="personal"
        title="Datos personales"
        items={[
          { label: "Nombre", value: guest.firstName },
          { label: "Apellido", value: guest.lastName },
          {
            label: "Fecha de nacimiento",
            value: formatIsoDate(guest.birthDate),
          },
          { label: "DNI", value: formatDni(guest.dni) },
          { label: "Dirección", value: guest.address },
          { label: "Obra social", value: guest.healthInsuranceLabel },
          {
            label: "Número de afiliado",
            value: guest.healthInsuranceMemberNumber,
          },
        ]}
      />
      <DetailSection
        id="hospitalization"
        title="Internación"
        items={[
          {
            label: "Fecha de internación",
            value: formatIsoDate(guest.hospitalizationDate),
          },
          { label: "Origen", value: describeOrigin(guest, interviewHref) },
          {
            label: "Motivos de internación",
            value: guest.hospitalizationReasonLabels.join(", "),
            isWide: true,
          },
          {
            label: "Otro motivo de internación",
            value: guest.otherHospitalizationReason,
            isWide: true,
          },
          {
            label: "Síntomas no controlados",
            value: guest.uncontrolledSymptomLabels.join(", "),
            isWide: true,
          },
        ]}
      />
    </div>
  );
}
