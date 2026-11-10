import { checkDatabaseConnection } from "@/platform/database/client";

const HEALTHY_STATUS = "ok";
const UNAVAILABLE_STATUS = "unavailable";
const SERVICE_UNAVAILABLE_HTTP_STATUS = 503;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function createHealthResponse(): Promise<Response> {
  try {
    await checkDatabaseConnection();
    return Response.json(
      { status: HEALTHY_STATUS },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(
      "La verificación de salud no pudo consultar la base de datos.",
      error,
    );
    return Response.json(
      { status: UNAVAILABLE_STATUS },
      { status: SERVICE_UNAVAILABLE_HTTP_STATUS, headers: NO_STORE_HEADERS },
    );
  }
}
