import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Situação do segundo fator (TOTP) da sessão atual. */
export function useMfa(enabled = true) {
  return useQuery({
    queryKey: ["mfa"],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const [aal, factors] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);
      if (aal.error) throw aal.error;
      if (factors.error) throw factors.error;
      const verified = factors.data.totp.filter((f) => f.status === "verified");
      return {
        current: aal.data.currentLevel,
        next: aal.data.nextLevel,
        /** Tem 2FA cadastrado mas ainda não confirmou o código nesta sessão. */
        needsChallenge: aal.data.currentLevel === "aal1" && aal.data.nextLevel === "aal2",
        factors: verified,
        enabled: verified.length > 0,
      };
    },
  });
}

/** QR code do Auth pode vir como data URI ou como SVG puro. */
export function qrSource(qr: string) {
  return qr.startsWith("data:") ? qr : `data:image/svg+xml;utf8,${encodeURIComponent(qr)}`;
}
