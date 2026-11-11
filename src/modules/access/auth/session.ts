import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "./auth";
import {
  buildSignInPath,
  DEFAULT_DESTINATION,
  REQUESTED_PATH_HEADER,
} from "./redirect-destination";

export async function requireSession() {
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) {
    redirect(
      buildSignInPath(
        requestHeaders.get(REQUESTED_PATH_HEADER) ?? DEFAULT_DESTINATION,
      ),
    );
  }
  return session;
}
