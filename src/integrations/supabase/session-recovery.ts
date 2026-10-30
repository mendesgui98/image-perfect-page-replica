import { isAuthApiError } from "@supabase/supabase-js";

// Codes the Auth server returns when the stored session no longer exists there
// (local database recreated, user deleted, JWT secret changed, session revoked).
const DEAD_SESSION_CODES = new Set([
  "bad_jwt",
  "no_authorization",
  "user_not_found",
  "session_not_found",
  "session_expired",
  "refresh_token_not_found",
  "refresh_token_already_used",
]);

// True when the error means the stored session can never be used again, so it
// must be cleared locally; network failures and server errors keep the session.
export function isDeadSessionError(error: unknown): boolean {
  if (!isAuthApiError(error)) return false;
  if (error.code && DEAD_SESSION_CODES.has(error.code)) return true;
  return error.status === 401 || error.status === 403;
}
