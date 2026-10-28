import { HttpError } from "./http.ts";

// Chamadas administrativas ao serviço de Auth (GoTrue) com a chave service_role.

export type InvitedUser = { id: string; email: string };

export type AuthAdmin = {
  invite(email: string, data: Record<string, unknown>, redirectTo: string): Promise<InvitedUser>;
};

export function createAuthAdmin(
  authUrl: string,
  serviceKey: string,
  fetchImpl: typeof fetch = fetch,
): AuthAdmin {
  return {
    async invite(email, data, redirectTo) {
      const url = `${authUrl}/invite?redirect_to=${encodeURIComponent(redirectTo)}`;
      const res = await fetchImpl(url, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          authorization: `Bearer ${serviceKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ email, data }),
      });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const message = String(body["msg"] ?? body["message"] ?? body["error_description"] ?? "");
        if (res.status === 422 || /already/i.test(message)) {
          throw new HttpError(409, "user_exists", "Já existe um usuário com este e-mail");
        }
        throw new HttpError(502, "auth_error", `Falha ao enviar convite: ${message || res.status}`);
      }
      return { id: String(body["id"]), email: String(body["email"] ?? email) };
    },
  };
}
