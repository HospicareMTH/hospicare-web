// @vitest-environment node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

const MODULES_FOLDER = join(process.cwd(), "src/modules");
const CLIENT_DIRECTIVE = '"use client";';

function listClientBarrels(): string[] {
  return readdirSync(MODULES_FOLDER, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(MODULES_FOLDER, entry.name, "components", "index.ts"))
    .filter((barrelPath) => existsSync(barrelPath));
}

function listBarrelSources(barrelPath: string): string[] {
  const barrel = readFileSync(barrelPath, "utf8");
  return [...barrel.matchAll(/from "(\.[^"]+)"/g)].map(([, modulePath]) =>
    join(dirname(barrelPath), `${modulePath}.tsx`),
  );
}

describe("barriles de componentes", () => {
  it("RNF-22, sección 15.5: components/index.ts solo exporta componentes de cliente; las pantallas de servidor salen por index.ts", () => {
    for (const barrelPath of listClientBarrels()) {
      for (const source of listBarrelSources(barrelPath)) {
        const firstLine = readFileSync(source, "utf8").split("\n")[0]?.trim();
        expect(firstLine, source).toBe(CLIENT_DIRECTIVE);
      }
    }
  });
});
