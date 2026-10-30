import { describe, expect, it } from "vitest";
import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { isDeadSessionError } from "./session-recovery";

describe("isDeadSessionError", () => {
  it("detects sessions the Auth server no longer knows", () => {
    expect(
      isDeadSessionError(
        new AuthApiError(
          "Invalid Refresh Token: Refresh Token Not Found",
          400,
          "refresh_token_not_found",
        ),
      ),
    ).toBe(true);
    expect(isDeadSessionError(new AuthApiError("User not found", 403, "user_not_found"))).toBe(
      true,
    );
    expect(isDeadSessionError(new AuthApiError("invalid JWT", 403, "bad_jwt"))).toBe(true);
    expect(isDeadSessionError(new AuthApiError("unauthorized", 401, undefined))).toBe(true);
  });

  it("keeps the session on network or server failures", () => {
    expect(isDeadSessionError(null)).toBe(false);
    expect(isDeadSessionError(new AuthRetryableFetchError("Failed to fetch", 0))).toBe(false);
    expect(isDeadSessionError(new AuthApiError("boom", 500, "unexpected_failure"))).toBe(false);
    expect(isDeadSessionError(new Error("x"))).toBe(false);
  });
});
