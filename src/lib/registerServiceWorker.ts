import { registerSW } from "virtual:pwa-register";

const UPDATE_CHECK_MS = 15 * 60 * 1000;

/**
 * A worker using `skipWaiting` takes control while the open page still shows
 * assets from the previous cache, which looks like a deploy that never landed.
 * Reloading once on `controllerchange` swaps that stale view for the new build.
 */
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateSW(true);
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      void registration.update();
      window.setInterval(() => void registration.update(), UPDATE_CHECK_MS);
    },
  });
}
