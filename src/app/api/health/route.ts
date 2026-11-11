import { connection } from "next/server";

import { createHealthResponse } from "@/platform/health";

export async function GET() {
  await connection();
  return createHealthResponse();
}
