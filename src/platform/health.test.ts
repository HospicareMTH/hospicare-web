// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkDatabaseConnection } from "@/platform/database/client";

import { createHealthResponse } from "./health";

vi.mock("@/platform/database/client", () => ({
  checkDatabaseConnection: vi.fn(),
}));

describe("createHealthResponse", () => {
  beforeEach(() => {
    vi.mocked(checkDatabaseConnection).mockReset();
  });

  it("RNF-11: responde activo, sin datos y sin caché, cuando la base responde", async () => {
    vi.mocked(checkDatabaseConnection).mockResolvedValue();

    const response = await createHealthResponse();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("RNF-11: responde no disponible, sin detalles, cuando la base falla", async () => {
    vi.mocked(checkDatabaseConnection).mockRejectedValue(
      new Error("connection refused"),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await createHealthResponse();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });
});
