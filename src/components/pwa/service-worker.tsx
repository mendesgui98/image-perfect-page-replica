import { useEffect } from "react";
import { toast } from "sonner";

/** Registra o service worker em produção e avisa quando houver nova versão. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (!import.meta.env.PROD) {
      // Em desenvolvimento, remove service workers de builds anteriores (evitam páginas velhas).
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => void r.unregister()));
      return;
    }

    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const offerUpdate = (worker: ServiceWorker) =>
      toast("Nova versão disponível", {
        duration: Infinity,
        action: { label: "Atualizar", onClick: () => worker.postMessage("SKIP_WAITING") },
      });

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          offerUpdate(registration.waiting);
        }
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              offerUpdate(worker);
            }
          });
        });
      })
      .catch((error) => console.warn("Service worker não registrado", error));

    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return null;
}
