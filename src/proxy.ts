import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

import { buildSignInPath, REQUESTED_PATH_HEADER } from "@/modules/access";

export function proxy(request: NextRequest) {
  const requestedPath = request.nextUrl.pathname + request.nextUrl.search;

  if (!getSessionCookie(request)) {
    return NextResponse.redirect(
      new URL(buildSignInPath(requestedPath), request.url),
    );
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUESTED_PATH_HEADER, requestedPath);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|iniciar-sesion|registro|invitaciones/aceptar|recuperar-contrasena|restablecer-contrasena|.*\\.(?:svg|png|jpg|jpeg|ico|webp|webmanifest|txt|xml)$).*)",
  ],
};
