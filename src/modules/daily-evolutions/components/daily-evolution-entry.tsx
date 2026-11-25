"use client";

import {
  Cancel01Icon,
  NoteAddIcon,
  PencilEdit02Icon,
  SquareLock02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { AnnulmentDialog } from "@/components/shared/annulment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  addClarificationAction,
  annulDailyEvolutionAction,
  updateDailyEvolutionAction,
} from "../actions";
import { EvolutionTextForm } from "./evolution-text-form";

const ACTION_BUTTON_CLASS_NAME = "h-9 px-2 text-sm";

export type EvolutionByline = {
  timeLabel: string;
  timeIso: string;
  authorLabel: string;
  signature: string;
};

export type ClarificationEntry = EvolutionByline & {
  id: string;
  text: string;
};

export type DailyEvolutionEntryData = EvolutionByline & {
  id: string;
  version: string;
  text: string;
  isLocked: boolean;
  editableUntilLabel: string | null;
  modifiedAtLabel: string | null;
  clarifications: ClarificationEntry[];
  canEdit: boolean;
  canAnnul: boolean;
  clarificationSignature: string | null;
};

function Byline({
  byline,
  prefix,
}: {
  byline: EvolutionByline;
  prefix?: string;
}) {
  return (
    <>
      {prefix && (
        <span className="font-medium text-foreground">{prefix} · </span>
      )}
      <time
        dateTime={byline.timeIso}
        className="font-medium text-foreground tabular-nums"
      >
        {byline.timeLabel}
      </time>{" "}
      · {byline.authorLabel} · {byline.signature}
    </>
  );
}

type EntryMode = "reading" | "editing" | "clarifying";

export function DailyEvolutionEntry({
  evolution,
}: {
  evolution: DailyEvolutionEntryData;
}) {
  const [mode, setMode] = useState<EntryMode>("reading");
  const [isAnnulling, setIsAnnulling] = useState(false);
  const canClarify = evolution.clarificationSignature !== null;
  const hasActions = evolution.canEdit || evolution.canAnnul || canClarify;

  return (
    <li className="flex flex-col gap-3 border-t py-5 first:border-t-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-sm text-muted-foreground">
          <Byline byline={evolution} />
        </p>
        {evolution.isLocked && (
          <Badge variant="outline">
            <HugeiconsIcon
              icon={SquareLock02Icon}
              data-icon="inline-start"
              aria-hidden="true"
            />
            Bloqueada
          </Badge>
        )}
      </div>

      {mode === "editing" ? (
        <EvolutionTextForm
          label="Evolución"
          initialText={evolution.text}
          submitLabel="Guardar cambios"
          pendingLabel="Guardando…"
          successMessage="Guardaste los cambios."
          save={(input) =>
            updateDailyEvolutionAction(evolution.id, evolution.version, input)
          }
          onSaved={() => setMode("reading")}
          onCancel={() => setMode("reading")}
        />
      ) : (
        <p className="max-w-prose text-base whitespace-pre-line">
          {evolution.text}
        </p>
      )}

      {(evolution.editableUntilLabel || evolution.modifiedAtLabel) && (
        <p className="text-sm text-muted-foreground">
          {evolution.modifiedAtLabel &&
            `Modificada el ${evolution.modifiedAtLabel}. `}
          {evolution.editableUntilLabel &&
            `Podés corregirla hasta el ${evolution.editableUntilLabel}.`}
        </p>
      )}

      {evolution.clarifications.length > 0 && (
        <ol className="ml-1 flex flex-col gap-3 border-l pl-4">
          {evolution.clarifications.map((clarification) => (
            <li key={clarification.id} className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">
                <Byline byline={clarification} prefix="Nota aclaratoria" />
              </p>
              <p className="max-w-prose text-base whitespace-pre-line">
                {clarification.text}
              </p>
            </li>
          ))}
        </ol>
      )}

      {mode === "clarifying" && evolution.clarificationSignature && (
        <EvolutionTextForm
          label="Nota aclaratoria"
          signature={evolution.clarificationSignature}
          submitLabel="Guardar nota"
          pendingLabel="Guardando…"
          successMessage="Nota aclaratoria agregada."
          save={(input) => addClarificationAction(evolution.id, input)}
          onSaved={() => setMode("reading")}
          onCancel={() => setMode("reading")}
        />
      )}

      {mode === "reading" && hasActions && (
        <div className="flex flex-wrap gap-1">
          {evolution.canEdit && (
            <Button
              variant="ghost"
              className={ACTION_BUTTON_CLASS_NAME}
              onClick={() => setMode("editing")}
            >
              <HugeiconsIcon
                icon={PencilEdit02Icon}
                data-icon="inline-start"
                aria-hidden="true"
              />
              Editar
            </Button>
          )}
          {canClarify && (
            <Button
              variant="ghost"
              className={ACTION_BUTTON_CLASS_NAME}
              onClick={() => setMode("clarifying")}
            >
              <HugeiconsIcon
                icon={NoteAddIcon}
                data-icon="inline-start"
                aria-hidden="true"
              />
              Agregar nota aclaratoria
            </Button>
          )}
          {evolution.canAnnul && (
            <Button
              variant="ghost"
              className={`${ACTION_BUTTON_CLASS_NAME} text-destructive hover:text-destructive`}
              onClick={() => setIsAnnulling(true)}
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                data-icon="inline-start"
                aria-hidden="true"
              />
              Anular
            </Button>
          )}
        </div>
      )}

      {isAnnulling && (
        <AnnulmentDialog
          title={`Anular la evolución del ${evolution.timeLabel}`}
          description="Sale del historial y ya no se va a poder modificar ni agregarle notas. No se borra: quedan registrados quién la anuló, cuándo y el motivo. No se puede deshacer."
          submitLabel="Anular evolución"
          successMessage="Evolución anulada."
          annul={(input) => annulDailyEvolutionAction(evolution.id, input)}
          onClose={() => setIsAnnulling(false)}
        />
      )}
    </li>
  );
}
