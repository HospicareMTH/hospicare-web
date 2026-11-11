import { SIGN_IN_PATH } from "../routes";

export const REDIRECT_PARAMETER = "redirectTo";
export const DEFAULT_DESTINATION = "/";
export const REQUESTED_PATH_HEADER = "x-hospicare-requested-path";

export function buildSignInPath(requestedPath: string): string {
  if (requestedPath === DEFAULT_DESTINATION || !isInternalPath(requestedPath)) {
    return SIGN_IN_PATH;
  }
  const search = new URLSearchParams({ [REDIRECT_PARAMETER]: requestedPath });
  return `${SIGN_IN_PATH}?${search}`;
}

export function isInternalPath(path: string): boolean {
  return (
    path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\")
  );
}

export function getSafeDestination(search: string): string {
  const requestedDestination = new URLSearchParams(search).get(
    REDIRECT_PARAMETER,
  );
  if (!requestedDestination || !isInternalPath(requestedDestination)) {
    return DEFAULT_DESTINATION;
  }
  return requestedDestination;
}
