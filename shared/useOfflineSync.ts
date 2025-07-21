// shared/useOfflineSync.ts
import { useEffect } from "react";

export function useEnableOfflineSync() {
  useEffect(() => {
    // Optional: Listen for Firestore offline failure events (dispatched from firebase.ts if you want)
    function handleOfflineFail(e: any) {
      // You could set app-level error UI, toast, etc.
      // Example: show a banner or use a global error store
      console.warn("Offline persistence failed:", e.detail);
    }

    function handleOnline() {
      window.location.reload();
    }

    window.addEventListener("hydrosafe:offline-fail", handleOfflineFail);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("hydrosafe:offline-fail", handleOfflineFail);
      window.removeEventListener("online", handleOnline);
    };
  }, []);
}